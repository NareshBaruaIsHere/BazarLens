-- Align an already-created Neon database with the current profile and
-- submission forms. Existing profile areas are copied into thana before the
-- obsolete users.area column is dropped.
BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS thana text;

DO $migration$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'users'
          AND column_name = 'area'
    ) THEN
        UPDATE users
        SET thana = area
        WHERE thana IS NULL OR btrim(thana) = '';
        ALTER TABLE users DROP COLUMN area;
    END IF;
END
$migration$;

UPDATE users SET thana = 'Unknown' WHERE thana IS NULL OR btrim(thana) = '';
ALTER TABLE users ALTER COLUMN thana SET NOT NULL;

ALTER TABLE submissions
    ADD COLUMN IF NOT EXISTS quality text NOT NULL DEFAULT 'Not recorded';

COMMIT;
