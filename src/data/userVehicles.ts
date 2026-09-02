/**
 * The signed-in user's own vehicles, stored in the shared evlineup Supabase
 * project (table: public.user_vehicles, RLS: own rows only — see
 * supabase/migrations/). Client-side ids are namespaced "u:<uuid>" so they can
 * never collide with catalog ids in share links.
 */
import { getSupabase } from '../auth/supabase';
import { CATEGORIES, type CategoryId } from './categories';
import type { Vehicle } from './types';

export interface UserVehicleInput {
  name: string;
  category: CategoryId;
  rangeKm: number;
  cruiseKph?: number;
  usableKwh?: number;
  fastChargeMin?: number;
}

interface Row {
  id: string;
  name: string;
  category: string;
  range_km: number;
  cruise_kph: number | null;
  usable_kwh: number | null;
  fast_charge_min: number | null;
}

function toVehicle(r: Row): Vehicle {
  const category = (r.category in CATEGORIES ? r.category : 'car') as CategoryId;
  return {
    id: `u:${r.id}`,
    name: r.name,
    make: 'Yours',
    category,
    variant: 'added by you',
    rangeKm: Number(r.range_km),
    basis: 'your figure',
    cruiseKph: r.cruise_kph != null ? Number(r.cruise_kph) : undefined,
    charge: r.usable_kwh != null && r.fast_charge_min != null
      ? { usableKwh: Number(r.usable_kwh), fastChargeMin: Number(r.fast_charge_min) }
      : undefined,
  };
}

export async function listUserVehicles(): Promise<Vehicle[]> {
  const sb = await getSupabase();
  const { data, error } = await sb.from('user_vehicles')
    .select('id,name,category,range_km,cruise_kph,usable_kwh,fast_charge_min')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as Row[]).map(toVehicle);
}

export async function addUserVehicle(input: UserVehicleInput): Promise<Vehicle> {
  const sb = await getSupabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) throw new Error('Not signed in');
  const { data, error } = await sb.from('user_vehicles').insert({
    user_id: auth.user.id,
    name: input.name,
    category: input.category,
    range_km: input.rangeKm,
    cruise_kph: input.cruiseKph ?? null,
    usable_kwh: input.usableKwh ?? null,
    fast_charge_min: input.fastChargeMin ?? null,
  }).select('id,name,category,range_km,cruise_kph,usable_kwh,fast_charge_min').single();
  if (error) throw new Error(error.message);
  return toVehicle(data as Row);
}

export async function deleteUserVehicle(clientId: string): Promise<void> {
  const sb = await getSupabase();
  const { error } = await sb.from('user_vehicles').delete().eq('id', clientId.replace(/^u:/, ''));
  if (error) throw new Error(error.message);
}
