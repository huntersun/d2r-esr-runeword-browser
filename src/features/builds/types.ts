import type { Build } from '@/core/supabase';

export type BuildSortMode = 'newest' | 'most_liked';

/** Public author fields embedded with a build (PostgREST join on builds.user_id). */
export interface BuildAuthor {
  readonly display_name: string;
  readonly discriminator: number;
  readonly avatar_url: string | null;
}

/** A build row with its author profile embedded. */
export type BuildWithAuthor = Build & { readonly profiles: BuildAuthor | null };

/**
 * A build as fetched for list views (cards). The list query skips the heavy
 * `build_data` jsonb and the free-form `description`, which cards never show.
 */
export type BuildListItem = Omit<BuildWithAuthor, 'build_data' | 'description'>;
