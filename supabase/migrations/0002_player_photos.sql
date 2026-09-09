-- =============================================================
-- FUTAPP - Migración 0002: fotos de jugadores
-- Agrega la columna photo_url a players (las fotos de equipos
-- ya viven en teams.logo_url).
-- =============================================================

alter table public.players
  add column if not exists photo_url text;