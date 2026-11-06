-- Duel: batas waktu per soal (0 = tanpa batas).
ALTER TABLE duels ADD COLUMN IF NOT EXISTS per_q_ms INTEGER NOT NULL DEFAULT 0;
