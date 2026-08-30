-- ═══════════════════════════════════════════════════════════
--  GAME BACKLOG — Supabase SQL Schema
--  Execute no SQL Editor do Supabase Dashboard
--  (Database > SQL Editor > New query)
-- ═══════════════════════════════════════════════════════════

-- 1. Tabela de Jogos
CREATE TABLE IF NOT EXISTS games (
  id          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT          NOT NULL,
  genre       TEXT          NOT NULL,
  platform    TEXT,
  cover_url   TEXT,
  status      TEXT          NOT NULL DEFAULT 'backlog'
              CHECK (status IN ('backlog', 'playing', 'completed', 'platinum', 'dropped')),
  is_focus    BOOLEAN       NOT NULL DEFAULT FALSE,
  weight      TEXT          NOT NULL DEFAULT 'medium'
              CHECK (weight IN ('heavy', 'medium', 'light')),
  sort_order  INTEGER       NOT NULL DEFAULT 0,
  tags        TEXT[]        DEFAULT '{}',
  notes       TEXT          DEFAULT '',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_games_status     ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_genre      ON games(genre);
CREATE INDEX IF NOT EXISTS idx_games_is_focus   ON games(is_focus);
CREATE INDEX IF NOT EXISTS idx_games_sort_order ON games(sort_order);

-- 2. Tabela de Configurações (Chave Gemini, preferências globais)
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT          PRIMARY KEY,
  value       TEXT          NOT NULL,
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 3. Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS games_updated_at ON games;
CREATE TRIGGER games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS settings_updated_at ON settings;
CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. Row Level Security (RLS)
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon on games" ON games;
DROP POLICY IF EXISTS "Allow all for anon" ON games;
CREATE POLICY "Allow all for anon on games"
  ON games FOR ALL TO anon
  USING (true) WITH CHECK (true);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for anon on settings" ON settings;
CREATE POLICY "Allow all for anon on settings"
  ON settings FOR ALL TO anon
  USING (true) WITH CHECK (true);
