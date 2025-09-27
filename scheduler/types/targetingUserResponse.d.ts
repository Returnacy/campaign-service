import type { TargetUser } from "./targetUser.d.js";

export type TargetingUserResponse = {
  users: TargetUser[];
  nextCursor?: string | null;
};