import { useEffect, type ReactNode } from "react";
import { useAuthSession } from "../auth/useAuthSession";
import {
  attributePendingBuilderInvite,
  restoreAuthenticatedBuilder,
} from "./index";

interface BuilderBootstrapProps {
  children: ReactNode;
}

export function BuilderBootstrap({
  children,
}: BuilderBootstrapProps) {
  const { session, loading } = useAuthSession();

  useEffect(() => {
    if (loading || !session?.user.id) {
      return;
    }

    const bootstrapBuilder = async (): Promise<void> => {
      try {
        await attributePendingBuilderInvite();
      } catch (error) {
        console.error(
          "Builder invite attribution failed:",
          error,
        );
      }

      try {
        await restoreAuthenticatedBuilder();
      } catch (error) {
        console.error(
          "Authenticated Builder restore failed:",
          error,
        );
      }
    };

    void bootstrapBuilder();
  }, [loading, session?.user.id]);

  return children;
}
