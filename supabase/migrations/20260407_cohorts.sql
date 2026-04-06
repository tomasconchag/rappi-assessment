-- Cohort management system

CREATE TABLE IF NOT EXISTS cohorts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  invite_token  TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(12), 'hex'),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  starts_at     TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ,
  -- Challenge sections override (null = use global config)
  enabled_sections TEXT[],
  -- Case assignment
  caso_mode     TEXT NOT NULL DEFAULT 'global',   -- 'global' | 'fixed' | 'random'
  fixed_caso_id UUID REFERENCES caso_bank(id) ON DELETE SET NULL,
  difficulty_filter TEXT,                          -- null = all difficulties (used when caso_mode = 'random')
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cohort_members (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id        UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  email            TEXT NOT NULL,
  assigned_caso_id UUID REFERENCES caso_bank(id) ON DELETE SET NULL,
  join_method      TEXT NOT NULL DEFAULT 'manual',  -- 'manual' | 'link'
  first_accessed_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cohort_id, email)
);

CREATE INDEX IF NOT EXISTS cohort_members_cohort_id_idx ON cohort_members(cohort_id);
CREATE INDEX IF NOT EXISTS cohort_members_email_idx ON cohort_members(email);
CREATE INDEX IF NOT EXISTS cohorts_invite_token_idx ON cohorts(invite_token);
