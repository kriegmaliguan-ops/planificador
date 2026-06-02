-- =============================================
-- BIBLIOTECA DE CALENTAMIENTOS
-- El profe arma una biblioteca reutilizable y la asigna
-- (uno por día) a cada rutina_dias.
-- =============================================

CREATE TABLE IF NOT EXISTS calentamientos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre           TEXT NOT NULL,
  descripcion      TEXT,
  duracion_minutos INT,
  video_url        TEXT,
  created_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE rutina_dias
  ADD COLUMN IF NOT EXISTS calentamiento_id UUID
  REFERENCES calentamientos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rutina_dias_calentamiento
  ON rutina_dias(calentamiento_id);

ALTER TABLE calentamientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_lee_calentamientos" ON calentamientos
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "profe_inserta_calentamientos" ON calentamientos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'profe')
  );

CREATE POLICY "profe_actualiza_calentamientos" ON calentamientos
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'profe')
  );

CREATE POLICY "profe_elimina_calentamientos" ON calentamientos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'profe')
  );

DROP TRIGGER IF EXISTS trg_calentamientos_updated_at ON calentamientos;
CREATE TRIGGER trg_calentamientos_updated_at
  BEFORE UPDATE ON calentamientos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
