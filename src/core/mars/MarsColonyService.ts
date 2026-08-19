import { supabase } from "../../lib/supabase";

export type MarsColony = {
  colony_id: string;
  colony_code: string;
  colony_name: string;
  specialization: string;
  colony_status: string;
  member_count: number;
  total_contribution: number;

  my_role: string;
  membership_status: string;
  joined_at: string | null;

  founder_builder_id: string;
  leader_builder_id: string;

  active_sector_id: string | null;
  active_sector_code: string | null;
  active_sector_name: string | null;
  active_sector_status: string | null;
  sector_assigned_at: string | null;

  created_at: string;
};

export type CreatedMarsColony = {
  colony_id: string;
  colony_code: string;
  colony_name: string;
  specialization: string;
  colony_status: string;
  member_count: number;
  created_at: string;
};

export async function getMyMarsColony(): Promise<MarsColony | null> {
  const { data, error } = await supabase.rpc(
    "get_my_mars_colony_v2",
  );

  if (error) {
    throw error;
  }

  const rows = data as MarsColony[] | null;

  return rows?.[0] ?? null;
}

export async function createMyMarsColony(
  name: string,
  specialization: string = "general",
): Promise<CreatedMarsColony> {
  const { data, error } = await supabase.rpc(
    "create_my_mars_colony",
    {
      p_name: name,
      p_specialization: specialization,
    },
  );

  if (error) {
    throw error;
  }

  const rows = data as CreatedMarsColony[] | null;
  const colony = rows?.[0];

  if (!colony) {
    throw new Error("Mars Colony creation returned no result.");
  }

  return colony;
}


// ============================================================
// Colony Management
// ============================================================

export type MarsColonyJoinRequest = {
  membership_id: string;
  colony_id: string;
  colony_code: string;
  colony_name: string;
  builder_id: string;
  membership_role: string;
  membership_status: string;
  requested_at: string;
};

export type MarsColonyJoinApproval = {
  membership_id: string;
  colony_id: string;
  builder_id: string;
  membership_status: string;
  joined_at: string;
  member_count: number;
};

export type MarsColonyJoinRejection = {
  membership_id: string;
  colony_id: string;
  builder_id: string;
  membership_status: string;
  resolved_at: string;
};

export type MarsColonyLeaveResult = {
  membership_id: string;
  colony_id: string;
  colony_name: string;
  membership_status: string;
  left_at: string;
  member_count: number;
};

export type MarsColonyLeadershipTransfer = {
  colony_id: string;
  colony_name: string;
  previous_leader_builder_id: string;
  new_leader_builder_id: string;
  transferred_at: string;
};

export type MarsColonyRoleChange = {
  colony_id: string;
  colony_name: string;
  target_builder_id: string;
  previous_role: string;
  new_role: string;
  changed_at: string;
};

function firstRpcRow<T>(
  data: unknown,
  message: string,
): T {
  const rows = data as T[] | null;
  const result = rows?.[0];

  if (!result) {
    throw new Error(message);
  }

  return result;
}

export async function getMyMarsColonyJoinRequests():
Promise<MarsColonyJoinRequest[]> {
  const { data, error } = await supabase.rpc(
    "get_my_mars_colony_join_requests",
  );

  if (error) {
    throw error;
  }

  return (data as MarsColonyJoinRequest[] | null) ?? [];
}

export async function approveMarsColonyJoinRequest(
  membershipId: string,
): Promise<MarsColonyJoinApproval> {
  const { data, error } = await supabase.rpc(
    "approve_mars_colony_join_request",
    {
      p_membership_id: membershipId,
    },
  );

  if (error) {
    throw error;
  }

  return firstRpcRow<MarsColonyJoinApproval>(
    data,
    "Mars Colony join approval returned no result.",
  );
}

export async function rejectMarsColonyJoinRequest(
  membershipId: string,
): Promise<MarsColonyJoinRejection> {
  const { data, error } = await supabase.rpc(
    "reject_mars_colony_join_request",
    {
      p_membership_id: membershipId,
    },
  );

  if (error) {
    throw error;
  }

  return firstRpcRow<MarsColonyJoinRejection>(
    data,
    "Mars Colony join rejection returned no result.",
  );
}

export async function leaveMyMarsColony():
Promise<MarsColonyLeaveResult> {
  const { data, error } = await supabase.rpc(
    "leave_my_mars_colony",
  );

  if (error) {
    throw error;
  }

  return firstRpcRow<MarsColonyLeaveResult>(
    data,
    "Mars Colony leave returned no result.",
  );
}

export async function transferMyMarsColonyLeadership(
  targetBuilderId: string,
): Promise<MarsColonyLeadershipTransfer> {
  const { data, error } = await supabase.rpc(
    "transfer_my_mars_colony_leadership",
    {
      p_target_builder_id: targetBuilderId,
    },
  );

  if (error) {
    throw error;
  }

  return firstRpcRow<MarsColonyLeadershipTransfer>(
    data,
    "Mars Colony leadership transfer returned no result.",
  );
}

export async function promoteMarsColonyOfficer(
  targetBuilderId: string,
): Promise<MarsColonyRoleChange> {
  const { data, error } = await supabase.rpc(
    "promote_mars_colony_officer",
    {
      p_target_builder_id: targetBuilderId,
    },
  );

  if (error) {
    throw error;
  }

  return firstRpcRow<MarsColonyRoleChange>(
    data,
    "Mars Colony Officer promotion returned no result.",
  );
}

export async function demoteMarsColonyOfficer(
  targetBuilderId: string,
): Promise<MarsColonyRoleChange> {
  const { data, error } = await supabase.rpc(
    "demote_mars_colony_officer",
    {
      p_target_builder_id: targetBuilderId,
    },
  );

  if (error) {
    throw error;
  }

  return firstRpcRow<MarsColonyRoleChange>(
    data,
    "Mars Colony Officer demotion returned no result.",
  );
}


// ============================================================
// Colony Discovery
// ============================================================

export type MarsColonyDirectoryEntry = {
  colony_id: string;
  colony_code: string;
  colony_name: string;
  specialization: string;
  colony_status: string;
  member_count: number;
  total_contribution: number;
  founder_builder_id: string;
  leader_builder_id: string;
  created_at: string;
};

export type MarsColonyJoinRequestResult = {
  membership_id: string;
  colony_id: string;
  colony_name: string;
  membership_status: string;
  requested_at: string;
};

export type MyPendingMarsColonyJoinRequest = {
  membership_id: string;
  colony_id: string;
  colony_code: string;
  colony_name: string;
  specialization: string;
  membership_status: string;
  requested_at: string;
};

export async function getMarsColonyDirectory():
Promise<MarsColonyDirectoryEntry[]> {
  const { data, error } = await supabase.rpc(
    "get_mars_colony_directory",
  );

  if (error) {
    throw error;
  }

  return (data as MarsColonyDirectoryEntry[] | null) ?? [];
}

export async function requestJoinMarsColony(
  colonyId: string,
): Promise<MarsColonyJoinRequestResult> {
  const { data, error } = await supabase.rpc(
    "request_join_mars_colony",
    {
      p_colony_id: colonyId,
    },
  );

  if (error) {
    throw error;
  }

  return firstRpcRow<MarsColonyJoinRequestResult>(
    data,
    "Mars Colony join request returned no result.",
  );
}


export async function getMyPendingMarsColonyJoinRequest():
Promise<MyPendingMarsColonyJoinRequest | null> {
  const { data, error } = await supabase.rpc(
    "get_my_pending_mars_colony_join_request",
  );

  if (error) {
    throw error;
  }

  const rows =
    data as MyPendingMarsColonyJoinRequest[] | null;

  return rows?.[0] ?? null;
}
