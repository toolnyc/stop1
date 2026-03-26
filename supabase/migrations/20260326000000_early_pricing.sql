-- Add tiered pricing support: early price + cutoff time
alter table public.events
  add column early_price numeric default null,
  add column early_cutoff timestamptz default null;

comment on column public.events.early_price is 'Price before early_cutoff (null = no early pricing)';
comment on column public.events.early_cutoff is 'Timestamp when early pricing ends and door_price applies';
