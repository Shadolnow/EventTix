-- Add batch tracking to tickets table
-- This migration adds columns to group tickets purchased together in bulk

ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS batch_id UUID,
ADD COLUMN IF NOT EXISTS quantity_in_batch INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS ticket_number_in_batch INTEGER DEFAULT 1;

-- Create index for efficient batch queries
CREATE INDEX IF NOT EXISTS idx_tickets_batch_id ON public.tickets(batch_id);

-- Add helpful comments
COMMENT ON COLUMN public.tickets.batch_id IS 'Groups tickets purchased together in a single bulk transaction';
COMMENT ON COLUMN public.tickets.quantity_in_batch IS 'Total number of tickets in this batch (e.g., 5 for a 5-ticket purchase)';
COMMENT ON COLUMN public.tickets.ticket_number_in_batch IS 'This tickets sequential number within the batch (1 of 5, 2 of 5, etc.)';
