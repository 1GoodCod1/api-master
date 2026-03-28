/**
 * Шаблоны сообщений с параметрами (даты, id, статусы, списки).
 *
 * **Когда использовать:** строка зависит от runtime-значений (id, enum, счётчики).
 * **Когда нет:** вынесите константу в {@link AppErrorMessages}.
 *
 * **Имена функций:** camelCase, глагол + сущность, например `bookingStatusTransition`, `cityWithId`.
 */
export const AppErrorTemplates = {
  authLockoutEmail: (minutes: number) =>
    `Too many failed login attempts. Try again in ${minutes} minutes.`,

  authLockoutIp: (minutes: number) =>
    `Too many failed attempts from this IP. Try again in ${minutes} minutes.`,

  jwtUserMissingOrBanned: (isBanned: boolean) =>
    isBanned ? 'Your account is blocked' : 'User not found',

  rolesRequired: (requiredRoles: string[], actualRole: string) =>
    `Required roles: ${requiredRoles.join(', ')}. Your role: ${actualRole}`,

  invalidReviewStatus: (statusRaw: string) => `Invalid status: ${statusRaw}`,

  confirmBookingWrongStatus: (status: string) =>
    `Cannot confirm booking with status ${status}. Only PENDING bookings can be confirmed.`,

  rejectBookingWrongStatus: (status: string) =>
    `Cannot reject booking with status ${status}. Only PENDING bookings can be rejected.`,

  bookingStatusTransition: (
    currentStatus: string,
    newStatus: string,
    allowed: string[],
  ) =>
    `Cannot transition booking from ${currentStatus} to ${newStatus}. Allowed: ${allowed.join(', ') || 'none (final status)'}`,

  createBookingFromFinalLead: (leadStatus: string) =>
    `Cannot create booking from a ${leadStatus} lead.`,

  leadMaxActive: (max: number) =>
    `Master has reached the maximum number of active leads (${max}). Please wait or subscribe to get notified when available.`,

  leadDailyLimit: (max: number) =>
    `Master has reached the daily limit of ${max} leads. Please try again tomorrow.`,

  leadFinalState: (oldStatus: string) =>
    `Lead is already in a final state (${oldStatus}) and cannot be changed.`,

  leadStatusTransition: (
    oldStatus: string,
    newStatus: string,
    allowed: string[],
  ) =>
    `Invalid status transition from ${oldStatus} to ${newStatus}. Allowed: ${allowed.join(', ')}`,

  profileEditCooldown: (cooldownDays: number, daysLeft: number) =>
    `Profile can be edited once every ${cooldownDays} days. Try again in ${daysLeft} days.`,

  tariffTypeExists: (type: string) => `Tariff with type ${type} already exists`,

  tariffByTypeNotFound: (type: string) => `Tariff with type ${type} not found`,

  categoryWithId: (id: string) => `Category with ID "${id}" not found`,

  cityWithId: (id: string) => `City with ID "${id}" not found`,

  cityNotFound: (slugOrName: string) => `City "${slugOrName}" not found.`,

  categoryNotFound: (slugOrName: string) =>
    `Category "${slugOrName}" not found.`,

  entityWithIdNotFound: (name: string, id: string) =>
    `${name} with ID "${id}" not found`,

  entityDeleteBlocked: (entitySingular: string) =>
    `Cannot delete ${entitySingular}: active masters are linked`,

  invalidCriterion: (criterion: string) => `Invalid criterion: ${criterion}`,

  criterionRatingRange: (criterion: string) =>
    `Criterion ${criterion} rating must be between 1 and 5`,

  miaUrlMissing: (envVars: string) =>
    `MIA or app URL not configured. Set in .env: ${envVars}`,

  miaQrCreationFailed: (hasResult: boolean) =>
    hasResult ? 'MIA QR creation failed' : 'MIA payment is not configured',

  exportInvalidType: (validList: string) =>
    `Invalid export type. Use: ${validList}`,

  exportNotReady: (status: string) => `Export not ready yet. Status: ${status}`,

  unknownAuditAction: (action: string) => `Unknown audit action: ${action}`,

  unknownAuditGroup: (group: string) => `Unknown group: ${group}`,

  photoLimitForPlan: (count: number, totalLimit: number) =>
    `Photo limit reached for your plan (${count}/${totalLimit}). Upgrade your plan or buy extra photos to add more.`,

  invalidFileContent: (message: string) => message,

  validationFailed: () => 'Validation failed' as const,
};
