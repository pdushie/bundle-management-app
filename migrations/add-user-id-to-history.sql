-- Add user_id column to history_entries table
ALTER TABLE history_entries ADD COLUMN IF NOT EXISTS user_id integer REFERENCES users(id) ON DELETE CASCADE;

-- Add indices if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_history_entries_user_id'
    ) THEN
        CREATE INDEX idx_history_entries_user_id ON history_entries(user_id);
    END IF;
END $$;
