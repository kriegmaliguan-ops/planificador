-- =============================================
-- TABLA: push_subscriptions
-- Almacena las suscripciones Web Push de cada usuario.
-- Un usuario puede tener múltiples suscripciones (uno por dispositivo).
-- =============================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions (user_id);

-- =============================================
-- RLS
-- =============================================
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- El usuario puede gestionar sus propias suscripciones
CREATE POLICY "user_lee_sus_subs" ON push_subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_inserta_sus_subs" ON push_subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_elimina_sus_subs" ON push_subscriptions
  FOR DELETE USING (user_id = auth.uid());
