/**
 * Canonical `entityType` values stored in audit logs.
 * Use these in every `auditService.log()` call — add a member when a new domain emits audit events.
 */
export enum AuditEntityType {
  User = 'User',
  Master = 'Master',
  Payment = 'Payment',
  Tariff = 'Tariff',
  MasterVerification = 'MasterVerification',
  Consent = 'Consent',
  IpBlacklist = 'IpBlacklist',
  HttpRequest = 'HTTP_REQUEST',
}
