-- Allow admin accounts to toggle whether they appear in leaderboards (Weekly, Per-Blok, All-Time, Gladiator).
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_in_leaderboard BOOLEAN NOT NULL DEFAULT false;
