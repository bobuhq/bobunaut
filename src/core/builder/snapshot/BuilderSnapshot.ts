import type { Builder } from "../../models/Builder";

/**
 * Authoritative Builder state restored from persistent storage.
 *
 * The snapshot contains only domain state. Supabase row shapes,
 * persistence metadata and query errors must not leak into it.
 *
 * Derived access rules may be recalculated by builderStore.restore().
 */
export type BuilderSnapshot = Builder;
