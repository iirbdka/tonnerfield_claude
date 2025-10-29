-- Enable btree_gist extension for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add exclusion constraint to prevent overlapping reservations for the same coach
-- This constraint ensures that for active reservations (PENDING, CONFIRMED, ATTENDED, HOLIDAY),
-- no two reservations can overlap for the same coach
ALTER TABLE reservations
ADD CONSTRAINT no_overlap_per_coach
EXCLUDE USING gist (
  coach_id WITH =,
  tstzrange(start_at, end_at) WITH &&
)
WHERE (status IN ('PENDING', 'CONFIRMED', 'ATTENDED', 'HOLIDAY'));