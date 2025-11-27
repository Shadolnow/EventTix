-- Create ticket_claim_logs table for rate limiting
CREATE TABLE public.ticket_claim_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient rate limiting queries
CREATE INDEX idx_ticket_claim_logs_ip_event_time 
  ON public.ticket_claim_logs(ip_address, event_id, created_at DESC);

CREATE INDEX idx_ticket_claim_logs_email 
  ON public.ticket_claim_logs(email, event_id);

-- Enable RLS
ALTER TABLE public.ticket_claim_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can view all claim logs"
  ON public.ticket_claim_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Event owners can view their event claim logs"
  ON public.ticket_claim_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = ticket_claim_logs.event_id
        AND events.user_id = auth.uid()
    )
  );