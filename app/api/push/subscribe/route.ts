import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 })
  }

  const userAgent = request.headers.get('user-agent') ?? null

  // UPSERT por endpoint único: si ya existe esa suscripción, actualizar last_used_at
  const { error } = await (supabase.from('push_subscriptions') as any)
    .upsert(
      {
        user_id: user.id,
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        user_agent: userAgent,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    )

  if (error) {
    console.error('Error guardando push subscription:', error)
    return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
