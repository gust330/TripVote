import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// ── Rooms ─────────────────────────────────────────────────────────────────────

export async function getRoom(code) {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', code)
    .single()
  if (error) return null
  return data
}

export async function createRoom(code, name) {
  const { error } = await supabase
    .from('rooms')
    .insert({ code, name })
  return !error
}

// ── Votes ─────────────────────────────────────────────────────────────────────

export async function getVotes(roomCode) {
  const { data, error } = await supabase
    .from('votes')
    .select('*')
    .eq('room_code', roomCode)
    .order('created_at', { ascending: true })
  if (error) return []
  return data
}

export async function insertVote(roomCode, vote) {
  const { error } = await supabase
    .from('votes')
    .insert({
      room_code:   roomCode,
      name:        vote.name,
      destination: vote.destination,
      duration:    vote.duration,
      months:      vote.months,
      budget:      vote.budget,
      activities:  vote.activities,
    })
  return !error
}
