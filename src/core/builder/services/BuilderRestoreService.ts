import { supabase } from "../../../lib/supabase";
import { builderStore } from "../../../store/builderStore";
import { builderMapper } from "../mapper/BuilderMapper";
import { builderRepository } from "../repository/BuilderRepository";

/**
 * Restores the authenticated Builder from Supabase and publishes
 * the authoritative snapshot to the shared Builder Store.
 *
 * Returns null when there is no authenticated user.
 */
export const restoreAuthenticatedBuilder = async (
  expectedBuilderId?: string,
) => {
  const {
    data: { session: initialSession },
  } = await supabase.auth.getSession();

  const builderId =
    expectedBuilderId ?? initialSession?.user.id;

  if (!builderId) {
    return null;
  }

  /*
   * When the caller supplies an expected Builder ID, reject a
   * mismatching active session before reading persistent state.
   */
  if (
    expectedBuilderId &&
    initialSession?.user.id !== expectedBuilderId
  ) {
    return null;
  }

  const source = await builderRepository.load(builderId);
  const snapshot = builderMapper.toSnapshot(source);

  /*
   * The session may change while Supabase queries are running.
   * Verify ownership again before publishing the snapshot.
   */
  const {
    data: { session: currentSession },
  } = await supabase.auth.getSession();

  if (currentSession?.user.id !== builderId) {
    return null;
  }

  builderStore.restore(snapshot);

  return source;
};
