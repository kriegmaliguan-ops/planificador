-- =============================================
-- BLOQUES DE DÍA
-- Combinaciones reutilizables de ejercicios (ej: "Pecho y tríceps")
-- que se pueden aplicar a cualquier día de cualquier rutina.
-- =============================================

CREATE TABLE IF NOT EXISTS bloques_dia (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bloque_ejercicios (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bloque_id         UUID NOT NULL REFERENCES bloques_dia(id) ON DELETE CASCADE,
  ejercicio_id      UUID NOT NULL REFERENCES ejercicios(id) ON DELETE RESTRICT,
  orden             INT NOT NULL DEFAULT 0,
  series            INT NOT NULL DEFAULT 3,
  repeticiones      TEXT NOT NULL DEFAULT '10',
  peso_objetivo     NUMERIC(6,2),
  descanso_segundos INT DEFAULT 90,
  notas             TEXT,
  rpe_objetivo      SMALLINT CHECK (rpe_objetivo BETWEEN 1 AND 10)
);

CREATE INDEX IF NOT EXISTS idx_bloque_ejercicios_bloque
  ON bloque_ejercicios(bloque_id);

ALTER TABLE bloques_dia ENABLE ROW LEVEL SECURITY;
ALTER TABLE bloque_ejercicios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_lee_bloques" ON bloques_dia
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "profe_inserta_bloques" ON bloques_dia
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'profe')
  );
CREATE POLICY "profe_actualiza_bloques" ON bloques_dia
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'profe')
  );
CREATE POLICY "profe_elimina_bloques" ON bloques_dia
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'profe')
  );

CREATE POLICY "auth_lee_bloque_ej" ON bloque_ejercicios
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "profe_modifica_bloque_ej" ON bloque_ejercicios
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'profe')
  );

DROP TRIGGER IF EXISTS trg_bloques_updated_at ON bloques_dia;
CREATE TRIGGER trg_bloques_updated_at
  BEFORE UPDATE ON bloques_dia
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
