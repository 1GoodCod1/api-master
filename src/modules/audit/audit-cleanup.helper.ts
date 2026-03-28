import {
  AppErrors,
  AppErrorMessages,
  AppErrorTemplates,
} from '../../common/errors';
import type { Prisma } from '@prisma/client';
import { AuditAction } from './audit-action.enum';
import type { AuditCleanupDto } from './dto/audit-cleanup.dto';
import { AUDIT_CLEANUP_GROUP_KEYS } from './dto/audit-cleanup.dto';

const CONSENT_ACTIONS: readonly string[] = [
  AuditAction.CONSENT_GRANTED,
  AuditAction.CONSENT_REVOKED,
];

/** Actions per admin-selectable group (union when multiple checked). */
export const AUDIT_CLEANUP_GROUP_ACTIONS: Record<string, readonly string[]> = {
  auth: [
    AuditAction.USER_REGISTERED,
    AuditAction.LOGIN_SUCCESS,
    AuditAction.LOGIN_FAILED,
    AuditAction.USER_LOGOUT,
    AuditAction.USER_LOGOUT_ALL,
    AuditAction.PASSWORD_RESET_REQUESTED,
    AuditAction.PASSWORD_RESET_COMPLETED,
    AuditAction.CHANGE_PASSWORD,
    AuditAction.PHONE_VERIFIED,
    AuditAction.EMAIL_VERIFIED,
  ],
  security: [
    AuditAction.USER_BANNED,
    AuditAction.USER_UNBANNED,
    AuditAction.IP_BLACKLISTED,
    AuditAction.SUSPICIOUS_SCORE_INCREASED,
  ],
  consent: [...CONSENT_ACTIONS],
  gdpr: [AuditAction.USER_SELF_DELETED, AuditAction.USER_DATA_EXPORTED],
  verification: [
    AuditAction.VERIFICATION_SUBMITTED,
    AuditAction.VERIFICATION_REVIEWED,
    AuditAction.VERIFICATION_DOCUMENTS_PURGED,
  ],
  admin: [AuditAction.ADMIN_USER_UPDATED, AuditAction.ADMIN_MASTER_UPDATED],
  payments: [
    AuditAction.TARIFF_CREATED,
    AuditAction.TARIFF_UPDATED,
    AuditAction.TARIFF_DELETED,
    AuditAction.FREE_PLAN_CLAIMED,
    AuditAction.PAYMENT_CREATED,
    AuditAction.PAYMENT_CONFIRMED,
    AuditAction.TARIFF_UPGRADE_CONFIRMED,
    AuditAction.TARIFF_UPGRADE_CANCELLED,
    AuditAction.SUBSCRIPTION_CANCELLED,
  ],
};

const ALL_KNOWN_ACTIONS = new Set<string>(Object.values(AuditAction));

export function validateCleanupActions(actions: string[]): void {
  for (const a of actions) {
    if (!ALL_KNOWN_ACTIONS.has(a)) {
      throw AppErrors.badRequest(AppErrorTemplates.unknownAuditAction(a));
    }
  }
}

export function buildAuditCleanupWhere(
  dto: AuditCleanupDto,
): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};

  if (dto.olderThan) {
    where.createdAt = { lt: new Date(dto.olderThan) };
  }

  if (dto.mode === 'non_consent') {
    where.action = { notIn: [...CONSENT_ACTIONS] };
    return where;
  }

  if (dto.mode === 'groups') {
    const groups = dto.groups ?? [];
    if (groups.length === 0) {
      throw AppErrors.badRequest(
        AppErrorMessages.AUDIT_CLEANUP_MODE_GROUPS_EMPTY,
      );
    }
    const actions = new Set<string>();
    for (const g of groups) {
      if (
        !AUDIT_CLEANUP_GROUP_KEYS.includes(
          g as (typeof AUDIT_CLEANUP_GROUP_KEYS)[number],
        )
      ) {
        throw AppErrors.badRequest(AppErrorTemplates.unknownAuditGroup(g));
      }
      const list = AUDIT_CLEANUP_GROUP_ACTIONS[g];
      if (list) list.forEach((a) => actions.add(a));
    }
    if (actions.size === 0) {
      throw AppErrors.badRequest(
        AppErrorMessages.AUDIT_CLEANUP_NO_ACTIONS_RESOLVED,
      );
    }
    where.action = { in: [...actions] };
    return where;
  }

  if (dto.mode === 'actions') {
    const actions = dto.actions ?? [];
    if (actions.length === 0) {
      throw AppErrors.badRequest(
        AppErrorMessages.AUDIT_CLEANUP_MODE_ACTIONS_EMPTY,
      );
    }
    validateCleanupActions(actions);
    where.action = { in: actions };
    return where;
  }

  throw AppErrors.badRequest(AppErrorMessages.AUDIT_CLEANUP_INVALID_MODE);
}

export function assertCleanupSafety(dto: AuditCleanupDto): void {
  if (dto.dryRun) return;
  if (dto.olderThan) return;
  if (dto.confirmDeleteWithoutDate === true) return;
  throw AppErrors.badRequest(AppErrorMessages.AUDIT_CLEANUP_SAFETY_CONFIRM);
}
