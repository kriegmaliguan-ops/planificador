// Configuración de modalidades de ejercicio

export type Modalidad =
  | 'normal' | 'biserie' | 'superserie' | 'triserie'
  | 'drop_set' | 'rest_pause' | 'piramidal' | 'isometrica' | 'tempo'

export interface ModalidadInfo {
  label: string
  short: string          // Label corto para badge
  emoji: string
  color: string          // tailwind bg/text classes
  descripcion: string    // Texto que verá el alumno
  necesitaAgrupacion: boolean
}

export const MODALIDADES: Record<Modalidad, ModalidadInfo> = {
  normal: {
    label: 'Normal',
    short: 'Normal',
    emoji: '',
    color: '',
    descripcion: '',
    necesitaAgrupacion: false,
  },
  biserie: {
    label: 'Biserie',
    short: 'Biserie',
    emoji: '🔗',
    color: 'bg-purple-100 text-purple-700',
    descripcion: '2 ejercicios del mismo grupo muscular hechos seguido sin descanso entre medio.',
    necesitaAgrupacion: true,
  },
  superserie: {
    label: 'Superserie',
    short: 'Superserie',
    emoji: '🔗',
    color: 'bg-fuchsia-100 text-fuchsia-700',
    descripcion: '2 ejercicios de grupos musculares distintos hechos seguido sin descanso.',
    necesitaAgrupacion: true,
  },
  triserie: {
    label: 'Triserie',
    short: 'Triserie',
    emoji: '🔗',
    color: 'bg-indigo-100 text-indigo-700',
    descripcion: '3 ejercicios encadenados sin descanso entre medio.',
    necesitaAgrupacion: true,
  },
  drop_set: {
    label: 'Drop set',
    short: 'Drop',
    emoji: '🔻',
    color: 'bg-red-100 text-red-700',
    descripcion: 'Al fallar la serie, bajá el peso (~20%) y seguí sin descanso. Repetí 2-3 drops.',
    necesitaAgrupacion: false,
  },
  rest_pause: {
    label: 'Rest-pause',
    short: 'Rest-pause',
    emoji: '⏸',
    color: 'bg-amber-100 text-amber-800',
    descripcion: 'Hacé la serie hasta el fallo, descansá 15-20 seg, hacé más reps. Repetí 2-3 veces.',
    necesitaAgrupacion: false,
  },
  piramidal: {
    label: 'Piramidal',
    short: 'Piramidal',
    emoji: '🔺',
    color: 'bg-orange-100 text-orange-700',
    descripcion: 'Subí el peso por serie y bajá las reps. Ej: 12 reps → 10 → 8 → 6.',
    necesitaAgrupacion: false,
  },
  isometrica: {
    label: 'Isométrica',
    short: 'Isométrica',
    emoji: '⏱',
    color: 'bg-cyan-100 text-cyan-700',
    descripcion: 'Mantené la posición sin moverte por el tiempo indicado.',
    necesitaAgrupacion: false,
  },
  tempo: {
    label: 'Tempo',
    short: 'Tempo',
    emoji: '🎯',
    color: 'bg-emerald-100 text-emerald-700',
    descripcion: 'Controlá la cadencia del movimiento (mirá las notas para el ritmo exacto).',
    necesitaAgrupacion: false,
  },
}

export function isAgrupada(m: Modalidad): boolean {
  return MODALIDADES[m]?.necesitaAgrupacion ?? false
}
