import { useEffect } from "react";
import {
  Navigate,
  useParams,
} from "react-router-dom";

import {
  savePendingBuilderInviteCode,
} from "../../core/builder";

export function BuilderInviteEntry() {
  const { inviteCode } = useParams<{
    inviteCode: string;
  }>();

  useEffect(() => {
    if (inviteCode) {
      savePendingBuilderInviteCode(inviteCode);
    }
  }, [inviteCode]);

  return <Navigate to="/genesis" replace />;
}
