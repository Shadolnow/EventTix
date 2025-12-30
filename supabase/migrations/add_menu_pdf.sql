-- Add menu PDF URL column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS menu_pdf_url TEXT;

-- Add comment
COMMENT ON COLUMN events.menu_pdf_url IS 'URL to uploaded PDF menu for the event (e.g., food menu, program schedule)';
