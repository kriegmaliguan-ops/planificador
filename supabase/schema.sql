-- =============================================
-- PLANIFICADOR PRO - Schema Supabase
-- =============================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLA: profiles
-- Extiende auth.users con rol y datos extra
-- =============================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  nombre      TEXT NOT NULL,
  apellido    TEXT,
  avatar_url  TEXT,
  role        TEXT NOT NULL DEFAULT 'alumno' CHECK (role IN ('profe', 'alumno')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- TABLA: grupos_musculares
-- =============================================
CREATE TABLE grupos_musculares (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre  TEXT NOT NULL UNIQUE
);

INSERT INTO grupos_musculares (nombre) VALUES
  ('Pecho'),
  ('Espalda'),
  ('Hombros'),
  ('Bíceps'),
  ('Tríceps'),
  ('Cuádriceps'),
  ('Isquiotibiales'),
  ('Glúteos'),
  ('Pantorrillas'),
  ('Abdominales'),
  ('Core'),
  ('Cardio');

-- =============================================
-- TABLA: ejercicios
-- Biblioteca de ejercicios del profe
-- =============================================
CREATE TABLE ejercicios (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       TEXT NOT NULL,
  descripcion  TEXT,
  imagen_url   TEXT,
  video_url    TEXT,
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- TABLA: ejercicio_grupos (many-to-many)
-- =============================================
CREATE TABLE ejercicio_grupos (
  ejercicio_id  UUID NOT NULL REFERENCES ejercicios(id) ON DELETE CASCADE,
  grupo_id      UUID NOT NULL REFERENCES grupos_musculares(id) ON DELETE CASCADE,
  PRIMARY KEY (ejercicio_id, grupo_id)
);

-- =============================================
-- TABLA: rutinas
-- Plan semanal asignado a un alumno
-- =============================================
CREATE TABLE rutinas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  descripcion   TEXT,
  fecha_inicio  DATE,
  fecha_fin     DATE,
  activa        BOOLEAN NOT NULL DEFAULT true,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- TABLA: rutina_dias
-- Días de entrenamiento dentro de una rutina
-- =============================================
CREATE TABLE rutina_dias (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rutina_id   UUID NOT NULL REFERENCES rutinas(id) ON DELETE CASCADE,
  dia_semana  TEXT NOT NULL CHECK (dia_semana IN (
    'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'
  )),
  nombre      TEXT,  -- ej: "Pecho y Tríceps"
  orden       INT NOT NULL DEFAULT 0
);

-- =============================================
-- TABLA: rutina_ejercicios
-- Ejercicios asignados a un día con prescripción
-- =============================================
CREATE TABLE rutina_ejercicios (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dia_id              UUID NOT NULL REFERENCES rutina_dias(id) ON DELETE CASCADE,
  ejercicio_id        UUID NOT NULL REFERENCES ejercicios(id) ON DELETE RESTRICT,
  orden               INT NOT NULL DEFAULT 0,
  series              INT NOT NULL DEFAULT 3,
  repeticiones        TEXT NOT NULL DEFAULT '10',  -- puede ser "8-12" o "10"
  peso_objetivo       NUMERIC(6,2),                -- kg sugeridos
  descanso_segundos   INT DEFAULT 90,
  notas               TEXT
);

-- =============================================
-- TABLA: registros_progreso
-- Log de cada sesión del alumno
-- =============================================
CREATE TABLE registros_progreso (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rutina_ejercicio_id     UUID NOT NULL REFERENCES rutina_ejercicios(id) ON DELETE CASCADE,
  fecha                   DATE NOT NULL DEFAULT CURRENT_DATE,
  series_completadas      INT,
  repeticiones_realizadas TEXT,
  peso_utilizado          NUMERIC(6,2),
  rpe                     INT CHECK (rpe BETWEEN 1 AND 10),  -- esfuerzo percibido
  notas                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX idx_rutinas_alumno ON rutinas(alumno_id);
CREATE INDEX idx_rutina_dias_rutina ON rutina_dias(rutina_id);
CREATE INDEX idx_rutina_ejercicios_dia ON rutina_ejercicios(dia_id);
CREATE INDEX idx_registros_alumno_fecha ON registros_progreso(alumno_id, fecha DESC);
CREATE INDEX idx_registros_ejercicio ON registros_progreso(rutina_ejercicio_id);

-- =============================================
-- TRIGGER: updated_at automático
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_ejercicios_updated_at
  BEFORE UPDATE ON ejercicios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_rutinas_updated_at
  BEFORE UPDATE ON rutinas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- TRIGGER: crear profile automáticamente
-- Se ejecuta cuando un usuario se registra
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, nombre, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'alumno')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ejercicios        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ejercicio_grupos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupos_musculares ENABLE ROW LEVEL SECURITY;
ALTER TABLE rutinas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE rutina_dias       ENABLE ROW LEVEL SECURITY;
ALTER TABLE rutina_ejercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_progreso ENABLE ROW LEVEL SECURITY;

-- Helper: saber si el usuario autenticado es profe
CREATE OR REPLACE FUNCTION is_profe()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'profe'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---- profiles ----
CREATE POLICY "profe ve todos los profiles"
  ON profiles FOR SELECT
  USING (is_profe());

CREATE POLICY "alumno ve su propio profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profe gestiona profiles"
  ON profiles FOR ALL
  USING (is_profe());

CREATE POLICY "usuario actualiza su propio profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ---- grupos_musculares ----
CREATE POLICY "todos pueden ver grupos"
  ON grupos_musculares FOR SELECT
  USING (auth.role() = 'authenticated');

-- ---- ejercicios ----
CREATE POLICY "todos ven ejercicios"
  ON ejercicios FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "profe gestiona ejercicios"
  ON ejercicios FOR ALL
  USING (is_profe());

-- ---- ejercicio_grupos ----
CREATE POLICY "todos ven ejercicio_grupos"
  ON ejercicio_grupos FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "profe gestiona ejercicio_grupos"
  ON ejercicio_grupos FOR ALL
  USING (is_profe());

-- ---- rutinas ----
CREATE POLICY "profe ve todas las rutinas"
  ON rutinas FOR SELECT
  USING (is_profe());

CREATE POLICY "alumno ve sus rutinas"
  ON rutinas FOR SELECT
  USING (auth.uid() = alumno_id);

CREATE POLICY "profe gestiona rutinas"
  ON rutinas FOR ALL
  USING (is_profe());

-- ---- rutina_dias ----
CREATE POLICY "profe ve todos los dias"
  ON rutina_dias FOR SELECT
  USING (is_profe());

CREATE POLICY "alumno ve sus dias"
  ON rutina_dias FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rutinas r
      WHERE r.id = rutina_id AND r.alumno_id = auth.uid()
    )
  );

CREATE POLICY "profe gestiona dias"
  ON rutina_dias FOR ALL
  USING (is_profe());

-- ---- rutina_ejercicios ----
CREATE POLICY "profe ve todos los ejercicios de rutina"
  ON rutina_ejercicios FOR SELECT
  USING (is_profe());

CREATE POLICY "alumno ve ejercicios de sus rutinas"
  ON rutina_ejercicios FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rutina_dias rd
      JOIN rutinas r ON r.id = rd.rutina_id
      WHERE rd.id = dia_id AND r.alumno_id = auth.uid()
    )
  );

CREATE POLICY "profe gestiona ejercicios de rutina"
  ON rutina_ejercicios FOR ALL
  USING (is_profe());

-- ---- registros_progreso ----
CREATE POLICY "profe ve todos los registros"
  ON registros_progreso FOR SELECT
  USING (is_profe());

CREATE POLICY "alumno ve sus registros"
  ON registros_progreso FOR SELECT
  USING (auth.uid() = alumno_id);

CREATE POLICY "alumno registra su propio progreso"
  ON registros_progreso FOR INSERT
  WITH CHECK (auth.uid() = alumno_id);

CREATE POLICY "alumno actualiza sus registros"
  ON registros_progreso FOR UPDATE
  USING (auth.uid() = alumno_id);

CREATE POLICY "profe ve y gestiona registros"
  ON registros_progreso FOR ALL
  USING (is_profe());
