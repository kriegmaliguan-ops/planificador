-- =============================================
-- PLANTILLAS DE RUTINA
-- Las plantillas son rutinas con alumno_id = NULL e is_template = true.
-- Se pueden clonar para asignar a alumnos sin tener que armar desde cero.
-- =============================================

-- 1) Hacer alumno_id nullable
ALTER TABLE rutinas
  ALTER COLUMN alumno_id DROP NOT NULL;

-- 2) Agregar flag de plantilla
ALTER TABLE rutinas
  ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT false;

-- 3) Constraint: si es plantilla, no tiene alumno; si no, sí tiene
ALTER TABLE rutinas
  ADD CONSTRAINT chk_rutina_template_alumno CHECK (
    (is_template = true AND alumno_id IS NULL)
    OR
    (is_template = false AND alumno_id IS NOT NULL)
  );

-- 4) Las plantillas siempre tienen activa = false (no aplica) — opcional, pero limpio
-- 5) Índice para listar plantillas rápido
CREATE INDEX IF NOT EXISTS idx_rutinas_templates
  ON rutinas (is_template, created_at DESC)
  WHERE is_template = true;
