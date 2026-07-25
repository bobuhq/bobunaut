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
export const restoreAuthenticatedBuilder = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user.id) {
    return null;
  }

  const source = await builderRepository.load(
    session.user.id,
  );

  const snapshot = builderMapper.toSnapshot(source);

  builderStore.restore(snapshot);

  return source;
};
