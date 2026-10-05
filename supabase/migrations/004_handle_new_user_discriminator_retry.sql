-- 004_handle_new_user_discriminator_retry.sql
--
-- Fix: signups can fail with "Database error saving new user" when the random
-- default discriminator collides with an existing profile of the same name.
-- Apply manually via the Supabase SQL Editor to DEV first, then PROD — same flow
-- as the earlier migrations. Safe to run on a populated database: no data or
-- schema changes, only the handle_new_user() function body is replaced. The
-- on_auth_user_created trigger keeps pointing at it and needs no change.
--
-- Why: handle_new_user() (001, clamped in 003) inserts the profile and lets the
-- column default pick a random discriminator 1000-9999. Every magic-link signup
-- gets the same 'Adventurer' name, so with N existing Adventurers each signup has
-- an N/9000 chance of hitting profiles_name_discriminator_key. That unique
-- violation was unhandled, so it rolled back the auth.users insert and the user
-- just saw an opaque signup error.
--
-- Contents:
--   1. handle_new_user() — retry the profile insert with a fresh discriminator on
--      a (display_name, discriminator) collision; behaviour is otherwise identical
--      to the 003 definition (trim / blank fallback / 50-char clamp, avatar_url
--      from metadata, SECURITY DEFINER, empty search_path).

-- =====================================================================
-- 1. handle_new_user — retry on discriminator collision
-- =====================================================================

-- Strategy (mirrors the client-side retry in authSaga handleUpdateDisplayName):
--   * Attempts 1..10 pick a random discriminator, like the column default does.
--   * Attempts 11..20 pick a random discriminator from the ones still free for
--     this name, so a crowded name still succeeds instead of gambling. A retry is
--     only needed again if a concurrent signup grabs the same free slot.
--   * If no discriminator is free (all 9000 taken) or 20 attempts are used up,
--     raise a clear unique_violation instead of the raw constraint error.
-- Only profiles_name_discriminator_key collisions are retried; any other unique
-- violation (e.g. a duplicate id) is re-raised unchanged.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_name      text;
  clamped_name  text;
  disc          smallint;
  attempt       integer := 0;
  max_attempts  constant integer := 20;
  random_tries  constant integer := 10;
  violated      text;
begin
  raw_name := coalesce(
    nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data->>'user_name'), ''),
    'Adventurer'
  );
  clamped_name := left(raw_name, 50);

  loop
    attempt := attempt + 1;

    if attempt <= random_tries then
      disc := floor(random() * 9000 + 1000)::smallint;
    else
      select d::smallint into disc
      from generate_series(1000, 9999) as d
      where not exists (
        select 1 from public.profiles p
        where p.display_name = clamped_name and p.discriminator = d
      )
      order by random()
      limit 1;

      if disc is null then
        raise exception 'handle_new_user: no free discriminator left for display name "%"', clamped_name
          using errcode = 'unique_violation',
                hint = 'All discriminators 1000-9999 are taken for this display name.';
      end if;
    end if;

    begin
      insert into public.profiles (id, display_name, discriminator, avatar_url)
      values (new.id, clamped_name, disc, new.raw_user_meta_data->>'avatar_url');
      return new;
    exception when unique_violation then
      get stacked diagnostics violated = constraint_name;
      if violated is distinct from 'profiles_name_discriminator_key' then
        raise;
      end if;
      if attempt >= max_attempts then
        raise exception 'handle_new_user: could not find a free discriminator for display name "%" after % attempts', clamped_name, attempt
          using errcode = 'unique_violation';
      end if;
    end;
  end loop;
end;
$$;
