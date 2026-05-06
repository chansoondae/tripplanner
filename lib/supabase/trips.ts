import { createClient } from "./client";

export type TripRow = {
  id: string;
  user_id: string | null;
  title: string;
  markdown: string;
  meta: Record<string, unknown>;
  theme: string | null;
  created_at: string;
  updated_at: string;
};

export async function fetchTrips(): Promise<TripRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tp_trips")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as TripRow[];
}

export async function fetchTrip(id: string): Promise<TripRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tp_trips")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as TripRow;
}

export async function createTrip(markdown: string, title: string): Promise<TripRow> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("tp_trips")
    .insert({ markdown, title, meta: { title }, user_id: user?.id ?? null })
    .select()
    .single();

  if (error) throw error;
  return data as TripRow;
}

export async function updateTrip(
  id: string,
  markdown: string,
  title: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("tp_trips")
    .update({ markdown, title, meta: { title }, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteTripFromDB(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("tp_trips").delete().eq("id", id);
  if (error) throw error;
}
