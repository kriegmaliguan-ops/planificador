export type Role = 'profe' | 'alumno'

export type DiaSemana =
  | 'lunes'
  | 'martes'
  | 'miercoles'
  | 'jueves'
  | 'viernes'
  | 'sabado'
  | 'domingo'

// ── Tablas base ────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  email: string
  nombre: string
  apellido: string | null
  avatar_url: string | null
  role: Role
  peso: number | null
  altura: number | null
  fecha_nacimiento: string | null
  objetivo: string | null
  notas_profe: string | null
  instagram: string | null
  whatsapp: string | null
  suspendido: boolean | null
  password_changed: boolean | null
  created_at: string
  updated_at: string
}

export interface GrupoMuscular {
  id: string
  nombre: string
}

export interface Ejercicio {
  id: string
  nombre: string
  descripcion: string | null
  imagen_url: string | null
  video_url: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface EjercicioGrupo {
  ejercicio_id: string
  grupo_id: string
}

export interface Rutina {
  id: string
  alumno_id: string
  nombre: string
  descripcion: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  activa: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface RutinaDia {
  id: string
  rutina_id: string
  dia_semana: DiaSemana
  nombre: string | null
  orden: number
  es_descanso: boolean
  semana_numero: number
}

export interface RegistroBienestar {
  id: string
  alumno_id: string
  fecha: string
  descanso: number
  notas: string | null
  created_at: string
}

export interface RutinaEjercicio {
  id: string
  dia_id: string
  ejercicio_id: string
  orden: number
  series: number
  repeticiones: string
  peso_objetivo: number | null
  descanso_segundos: number | null
  notas: string | null
  rpe_objetivo: number | null
  modalidad?: string | null
  agrupacion?: string | null
  duracion_segundos?: number | null
  // Cardio
  tipo_cardio?: 'liss' | 'hiit' | 'tabata' | 'tempo' | null
  duracion_total_segundos?: number | null
  trabajo_segundos?: number | null
  descanso_intervalo_segundos?: number | null
  rondas?: number | null
  fc_objetivo_min?: number | null
  fc_objetivo_max?: number | null
  intensidad?: string | null
  metros_objetivo?: number | null
}

export interface RegistroProgreso {
  id: string
  alumno_id: string
  rutina_ejercicio_id: string
  fecha: string
  series_completadas: number | null
  repeticiones_realizadas: string | null
  peso_utilizado: number | null
  rpe: number | null
  notas: string | null
  created_at: string
  // Cardio
  tiempo_real_segundos?: number | null
  fc_promedio?: number | null
  distancia_metros?: number | null
}

// ── Tipos extendidos (con joins) ───────────────────────────────────────────

export interface EjercicioConGrupos extends Ejercicio {
  grupos: GrupoMuscular[]
}

export interface RutinaEjercicioConDetalle extends RutinaEjercicio {
  ejercicio: EjercicioConGrupos
}

export interface RutinaDiaConEjercicios extends RutinaDia {
  ejercicios: RutinaEjercicioConDetalle[]
}

export interface RutinaCompleta extends Rutina {
  alumno: Profile
  dias: RutinaDiaConEjercicios[]
}

export interface RegistroConDetalle extends RegistroProgreso {
  rutina_ejercicio: RutinaEjercicioConDetalle
}

// ── Tipos Database para Supabase client ───────────────────────────────────
// Estructura que exige @supabase/supabase-js: cada tabla necesita
// Relationships y el schema necesita Views, Enums y CompositeTypes.

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
        Relationships: []
      }
      grupos_musculares: {
        Row: GrupoMuscular
        Insert: Omit<GrupoMuscular, 'id'>
        Update: Partial<Omit<GrupoMuscular, 'id'>>
        Relationships: []
      }
      ejercicios: {
        Row: Ejercicio
        Insert: Omit<Ejercicio, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Ejercicio, 'id' | 'created_at'>>
        Relationships: []
      }
      ejercicio_grupos: {
        Row: EjercicioGrupo
        Insert: EjercicioGrupo
        Update: EjercicioGrupo
        Relationships: []
      }
      rutinas: {
        Row: Rutina
        Insert: Omit<Rutina, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Rutina, 'id' | 'created_at'>>
        Relationships: []
      }
      rutina_dias: {
        Row: RutinaDia
        Insert: Omit<RutinaDia, 'id'>
        Update: Partial<Omit<RutinaDia, 'id'>>
        Relationships: []
      }
      registros_bienestar: {
        Row: RegistroBienestar
        Insert: Omit<RegistroBienestar, 'id' | 'created_at'>
        Update: Partial<Omit<RegistroBienestar, 'id' | 'created_at'>>
        Relationships: []
      }
      rutina_ejercicios: {
        Row: RutinaEjercicio
        Insert: Omit<RutinaEjercicio, 'id'>
        Update: Partial<Omit<RutinaEjercicio, 'id'>>
        Relationships: []
      }
      registros_progreso: {
        Row: RegistroProgreso
        Insert: Omit<RegistroProgreso, 'id' | 'created_at'>
        Update: Partial<Omit<RegistroProgreso, 'id' | 'created_at'>>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_profe: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
