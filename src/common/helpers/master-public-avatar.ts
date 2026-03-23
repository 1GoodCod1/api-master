/**
 * Public listing/profile: prefer master avatar, fall back to account (user) avatar.
 * Masters may have avatar on User only (e.g. legacy /users/me/avatar) while Master.avatarFileId is null.
 */
export function resolvePublicMasterAvatarPath(master: {
  avatarFile?: { path?: string | null } | null | undefined;
  user?:
    | { avatarFile?: { path?: string | null } | null | undefined }
    | null
    | undefined;
}): string | null {
  const mp = master.avatarFile?.path;
  if (typeof mp === 'string' && mp.trim()) return mp;
  const up = master.user?.avatarFile?.path;
  if (typeof up === 'string' && up.trim()) return up;
  return null;
}
