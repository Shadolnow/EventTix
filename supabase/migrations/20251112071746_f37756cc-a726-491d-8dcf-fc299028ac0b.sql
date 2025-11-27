-- Create audit logging table for data exports
CREATE TABLE public.data_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL,
  record_count INT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on data_exports
ALTER TABLE public.data_exports ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own export history
CREATE POLICY "Users can view their own exports"
  ON public.data_exports
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own exports
CREATE POLICY "Users can log their own exports"
  ON public.data_exports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow admins to view all exports
CREATE POLICY "Admins can view all exports"
  ON public.data_exports
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for performance
CREATE INDEX idx_data_exports_user_id ON public.data_exports(user_id);
CREATE INDEX idx_data_exports_event_id ON public.data_exports(event_id);
CREATE INDEX idx_data_exports_created_at ON public.data_exports(created_at);