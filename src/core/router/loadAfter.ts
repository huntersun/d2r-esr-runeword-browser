/**
 * Resolves a lazily loaded route module only once `ready` has settled as well, so the screen cannot mount (and
 * dispatch its mount-effect requests) before the saga that answers them is listening.
 *
 * Why this and not "the saga re-issues requests whose status is already LOADING when it starts": redux-saga's
 * `takeLatest` never sees actions dispatched before the watcher runs, and replaying them would need the lost action's
 * arguments (build id, user id, page, filters) kept in state for every request type. Waiting at the route boundary
 * fixes all of them in one place, and the Suspense fallback already covers the wait.
 *
 * Both promises start together, so this adds no latency when the feature chunk and the saga chunk load in parallel.
 * `ready` must be safe to call repeatedly (React may call the lazy loader again after a failed load).
 */
export async function loadAfter<T>(load: () => Promise<T>, ready: () => Promise<void>): Promise<T> {
  const [module] = await Promise.all([load(), ready()]);
  return module;
}
