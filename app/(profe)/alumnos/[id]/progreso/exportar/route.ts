import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ShadingType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  Footer,
  PageNumber,
} from 'docx'

interface Props {
  params: Promise<{ id: string }>
}

function formatFecha(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

export async function GET(request: NextRequest, { params }: Props) {
  // Verify profe
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('No autenticado', { status: 401 })

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (callerProfile?.role !== 'profe') {
    return new NextResponse('Sin permisos', { status: 403 })
  }

  const { id: alumnoId } = await params
  const { searchParams } = new URL(request.url)
  const desde = searchParams.get('desde') ?? ''
  const hasta = searchParams.get('hasta') ?? ''

  if (!desde || !hasta) {
    return new NextResponse('Faltan parámetros desde/hasta', { status: 400 })
  }

  const admin = createAdminClient()

  // Fetch alumno name
  const { data: alumno } = await (admin.from('profiles') as any)
    .select('nombre, apellido')
    .eq('id', alumnoId)
    .single() as { data: { nombre: string; apellido: string | null } | null }

  if (!alumno) return new NextResponse('Alumno no encontrado', { status: 404 })

  const nombreCompleto = [alumno.nombre, alumno.apellido].filter(Boolean).join(' ')

  // Fetch progress records with exercise names
  const { data: registros } = await (admin.from('registros_progreso') as any)
    .select('id, fecha, series_completadas, repeticiones_realizadas, peso_utilizado, rpe, notas, rutina_ejercicio_id')
    .eq('alumno_id', alumnoId)
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: true }) as { data: any[] | null }

  const progreso = registros ?? []

  // Resolve exercise names
  const reIds = [...new Set(progreso.map((r: any) => r.rutina_ejercicio_id).filter(Boolean))] as string[]
  const nombreByReId = new Map<string, string>()

  if (reIds.length > 0) {
    const { data: rutinaEjs } = await (admin.from('rutina_ejercicios') as any)
      .select('id, ejercicio_id')
      .in('id', reIds) as { data: { id: string; ejercicio_id: string }[] | null }

    const ejIds = [...new Set((rutinaEjs ?? []).map((r) => r.ejercicio_id))] as string[]
    const reToEjId = new Map((rutinaEjs ?? []).map((r) => [r.id, r.ejercicio_id]))

    if (ejIds.length > 0) {
      const { data: ejercicios } = await (admin.from('ejercicios') as any)
        .select('id, nombre')
        .in('id', ejIds) as { data: { id: string; nombre: string }[] | null }

      const ejNombre = new Map((ejercicios ?? []).map((e) => [e.id, e.nombre]))
      for (const [reId, ejId] of reToEjId.entries()) {
        nombreByReId.set(reId, ejNombre.get(ejId) ?? 'Ejercicio')
      }
    }
  }

  // Group by date
  const sesionesMap = new Map<string, any[]>()
  for (const r of progreso) {
    if (!sesionesMap.has(r.fecha)) sesionesMap.set(r.fecha, [])
    sesionesMap.get(r.fecha)!.push(r)
  }

  const fechas = Array.from(sesionesMap.keys()).sort((a, b) => b.localeCompare(a))
  const totalSesiones = fechas.length
  const totalRegistros = progreso.length

  // ── Build document ────────────────────────────────────────────────────────

  const children: Paragraph[] = []

  // Title
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Progreso de ${nombreCompleto}`, bold: true, size: 36, font: 'Arial' })],
      spacing: { after: 120 },
    })
  )

  // Subtitle
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Período: ${formatFecha(desde)} al ${formatFecha(hasta)}`,
          size: 22,
          color: '666666',
          font: 'Arial',
        }),
      ],
      spacing: { after: 480 },
    })
  )

  // Sessions
  for (const fecha of fechas) {
    const registrosDia = sesionesMap.get(fecha)!

    // Date heading
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: formatFecha(fecha),
            bold: true,
            size: 28,
            font: 'Arial',
            color: '1e293b',
          }),
        ],
        spacing: { before: 360, after: 120 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1', space: 4 },
        },
      })
    )

    // Exercises
    for (const r of registrosDia) {
      const ejNombre = nombreByReId.get(r.rutina_ejercicio_id) ?? 'Ejercicio'

      // Build detail line
      const partes: string[] = []
      if (r.series_completadas != null) partes.push(`${r.series_completadas} series`)
      if (r.repeticiones_realizadas) partes.push(`${r.repeticiones_realizadas} reps`)
      if (r.peso_utilizado != null) partes.push(`${r.peso_utilizado} kg`)
      if (r.rpe != null) partes.push(`RPE ${r.rpe}/10`)
      const detalle = partes.join(' · ')

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: ejNombre, bold: true, size: 22, font: 'Arial' }),
            ...(detalle
              ? [new TextRun({ text: `   ${detalle}`, size: 22, font: 'Arial', color: '475569' })]
              : []),
          ],
          spacing: { before: 60, after: 60 },
          indent: { left: 360 },
        })
      )

      if (r.notas) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `"${r.notas}"`,
                size: 20,
                font: 'Arial',
                color: '64748b',
                italics: true,
              }),
            ],
            spacing: { before: 0, after: 60 },
            indent: { left: 720 },
          })
        )
      }
    }
  }

  // Summary footer paragraph
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Total sesiones: ${totalSesiones}   |   Total ejercicios registrados: ${totalRegistros}`,
          size: 20,
          font: 'Arial',
          color: '64748b',
          bold: true,
        }),
      ],
      spacing: { before: 600, after: 120 },
      alignment: AlignmentType.CENTER,
      border: {
        top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1', space: 8 },
      },
    })
  )

  if (totalSesiones === 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: 'No hay registros en el período seleccionado.',
            size: 24,
            font: 'Arial',
            color: '94a3b8',
            italics: true,
          }),
        ],
        spacing: { before: 480 },
      })
    )
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 22 } } },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 36, bold: true, font: 'Arial', color: '0f172a' },
          paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 28, bold: true, font: 'Arial', color: '1e293b' },
          paragraph: { spacing: { before: 300, after: 120 }, outlineLevel: 1 },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'Página ', size: 18, font: 'Arial', color: '94a3b8' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18, font: 'Arial', color: '94a3b8' }),
                  new TextRun({ text: ' / ', size: 18, font: 'Arial', color: '94a3b8' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, font: 'Arial', color: '94a3b8' }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)

  const safeName = nombreCompleto.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const filename = `progreso-${safeName}-${desde}-${hasta}.docx`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
