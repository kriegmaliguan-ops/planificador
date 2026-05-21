/**
 * Helper para castear resultados de Supabase al tipo correcto.
 * Usar cuando el cliente no tiene el genérico <Database>.
 *
 * Ejemplo:
 *   const { data } = typed<Profile>(await supabase.from('profiles').select('*').single())
 */
export function typed<T>(
  result: { data: unknown; error: unknown }
): { data: T | null; error: unknown } {
  return result as { data: T | null; error: unknown }
}

export function typedList<T>(
  result: { data: unknown; error: unknown }
): { data: T[]; error: unknown } {
  return { data: (result.data as T[]) ?? [], error: result.error }
}
