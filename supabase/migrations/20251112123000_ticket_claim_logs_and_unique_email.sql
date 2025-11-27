-- Create ticket_claim_logs table to support rate limiting and auditing
create table if not exists public.ticket_claim_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  email text not null,
  ip_address text not null,
  created_at timestamptz not null default now()
);

-- Helpful index for rate limiting lookups
create index if not exists idx_ticket_claim_logs_event_ip_time
  on public.ticket_claim_logs (event_id, ip_address, created_at desc);

-- Enforce at-most-one ticket per email per event
-- Note: If existing data violates this, the migration may fail. Consider cleaning duplicates before pushing.
do $$ begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'uq_tickets_event_email'
  ) then
    create unique index uq_tickets_event_email
      on public.tickets (event_id, attendee_email);
  end if;
end $$;

-- RLS is presumed enabled on tickets/events already; logs table can be open for insert via edge function (service role bypasses RLS)