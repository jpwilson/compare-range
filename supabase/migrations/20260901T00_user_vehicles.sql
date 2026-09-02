-- CompareRange: user-added vehicles.
-- Run once in the evlineup Supabase project (Dashboard → SQL Editor → paste → Run).

create table if not exists public.user_vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  category text not null check (category in ('ev','car','hybrid','moto','heli','plane','jet','airliner')),
  range_km numeric not null check (range_km > 0 and range_km <= 60000),
  cruise_kph numeric check (cruise_kph > 0 and cruise_kph <= 3000),
  usable_kwh numeric check (usable_kwh > 0 and usable_kwh <= 2000),
  fast_charge_min numeric check (fast_charge_min > 0 and fast_charge_min <= 1440),
  created_at timestamptz not null default now()
);

alter table public.user_vehicles enable row level security;

create policy "own rows" on public.user_vehicles
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists user_vehicles_user_id_idx on public.user_vehicles (user_id);
