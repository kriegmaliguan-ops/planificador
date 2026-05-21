import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const DIAS_SEMANA = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
] as const

export const DIAS_LABELS: Record<string, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
}

export function getDiaHoy(): string {
  const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
  return dias[new Date().getDay()]
}

/** Colores Tailwind para cada grupo muscular */
export const GRUPO_COLORS: Record<string, string> = {
  Pecho:           'bg-red-100 text-red-700',
  Espalda:         'bg-blue-100 text-blue-700',
  Hombros:         'bg-orange-100 text-orange-700',
  'Bíceps':        'bg-purple-100 text-purple-700',
  'Tríceps':       'bg-pink-100 text-pink-700',
  'Cuádriceps':    'bg-green-100 text-green-700',
  Isquiotibiales:  'bg-emerald-100 text-emerald-700',
  'Glúteos':       'bg-yellow-100 text-yellow-700',
  Pantorrillas:    'bg-teal-100 text-teal-700',
  Abdominales:     'bg-cyan-100 text-cyan-700',
  Core:            'bg-indigo-100 text-indigo-700',
  Cardio:          'bg-rose-100 text-rose-700',
}

export function grupoColor(nombre: string): string {
  return GRUPO_COLORS[nombre] ?? 'bg-slate-100 text-slate-600'
}

// ── RPE (1-10) ────────────────────────────────────────────────────────────────

export const RPE_CONFIG: Record<number, { label: string; desc: string }> = {
  1:  { label: 'Muy fácil',  desc: 'Sin esfuerzo perceptible' },
  2:  { label: 'Fácil',      desc: 'Muy cómodo, podés hablar' },
  3:  { label: 'Leve',       desc: 'Ritmo tranquilo' },
  4:  { label: 'Moderado',   desc: 'Algo de esfuerzo' },
  5:  { label: 'Medio',      desc: 'Respiración elevada' },
  6:  { label: 'Algo duro',  desc: 'Cuesta mantener el ritmo' },
  7:  { label: 'Duro',       desc: 'Difícil de sostener' },
  8:  { label: 'Muy duro',   desc: 'Casi al límite' },
  9:  { label: 'Extremo',    desc: 'No podés hablar' },
  10: { label: 'Máximo',     desc: 'Esfuerzo total' },
}

export function rpeButtonColor(n: number, selected: boolean): string {
  if (!selected) return 'bg-slate-100 text-slate-600 hover:bg-slate-200'
  if (n <= 2) return 'bg-emerald-500 text-white'
  if (n <= 4) return 'bg-lime-500 text-white'
  if (n <= 6) return 'bg-yellow-500 text-white'
  if (n <= 8) return 'bg-orange-500 text-white'
  return 'bg-red-600 text-white'
}

// ── Descanso / Sueño (1-7) ────────────────────────────────────────────────────

export const DESCANSO_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: 'Muy mal',   color: 'bg-red-500 text-white' },
  2: { label: 'Mal',       color: 'bg-orange-500 text-white' },
  3: { label: 'Regular',   color: 'bg-yellow-400 text-slate-900' },
  4: { label: 'Bien',      color: 'bg-lime-400 text-slate-900' },
  5: { label: 'Muy bien',  color: 'bg-emerald-400 text-white' },
  6: { label: 'Genial',    color: 'bg-emerald-500 text-white' },
  7: { label: 'Perfecto',  color: 'bg-emerald-600 text-white' },
}
