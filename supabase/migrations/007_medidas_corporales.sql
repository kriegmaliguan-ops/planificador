-- =============================================
-- TABLA: medidas_corporales
-- Una fila por fecha de medición (todos los campos opcionales)
-- =============================================
CREATE TABLE IF NOT EXISTS medidas_corporales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  cintura_cm      NUMERIC(5,1) CHECK (cintura_cm > 0 AND cintura_cm < 300),
  pecho_cm        NUMERIC(5,1) CHECK (pecho_cm > 0 AND pecho_cm < 300),
  brazo_cm        NUMERIC(5,1) CHECK (brazo_cm > 0 AND brazo_cm < 200),
  muslo_cm        NUMERIC(5,1) CHECK (muslo_cm > 0 AND muslo_cm < 200),
  pantorrilla_cm  NUMERIC(5,1) CHECK (pantorrilla_cm > 0 AND pantorrilla_cm < 200),
  cadera_cm       NUMERIC(5,1) CHECK (cadera_cm > 0 AND cadera_cm < 300),
  cuello_cm       NUMERIC(5,1) CHECK (cuello_cm > 0 AND cuello_cm < 100),
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (alumno_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_medidas_alumno_fecha
  ON medidas_corporales (alumno_id, fecha DESC);

-- =============================================
-- RLS
-- =============================================
ALTER TABLE medidas_corporales ENABLE ROW LEVEL SECURITY;

-- El alumno puede ver y editar SUS propias medidas
CREATE POLICY "alumno_lee_sus_medidas" ON medidas_corporales
  FOR SELECT USING (alumno_id = auth.uid());

CREATE POLICY "alumno_inserta_sus_medidas" ON medidas_corporales
  FOR INSERT WITH CHECK (alumno_id = auth.uid());

CREATE POLICY "alumno_actualiza_sus_medidas" ON medidas_corporales
  FOR UPDATE USING (alumno_id = auth.uid());

CREATE POLICY "alumno_elimina_sus_medidas" ON medidas_corporales
  FOR DELETE USING (alumno_id = auth.uid());

-- El profe puede leer las medidas de sus alumnos
CREATE POLICY "profe_lee_medidas_alumnos" ON medidas_corporales
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'profe'
    )
  );
