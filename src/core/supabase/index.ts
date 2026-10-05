// Only re-exports what is imported via '@/core/supabase'. The client itself is reached
// through `requireSupabase()`; eager app-shell code imports `isSupabaseConfigured`
// from './config' directly so @supabase/supabase-js stays out of the entry chunk.
export { isSupabaseConfigured } from './config';
export { requireSupabase } from './client';
export type { Database, Profile, ProfileUpdate, Build } from './types';
