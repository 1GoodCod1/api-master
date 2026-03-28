/**
 * Login flow messages — single source for API responses, audit, and login history.
 * Значения берутся из {@link AppErrorMessages}.
 */
import { AppErrorMessages } from '../../../common/errors';

export const AUTH_LOGIN_INVALID_CREDENTIALS =
  AppErrorMessages.AUTH_LOGIN_INVALID_CREDENTIALS;

/** Stored in login history / audit when the user exists but the password does not match. */
export const AUTH_LOGIN_FAIL_REASON_INVALID_PASSWORD =
  AppErrorMessages.AUTH_LOGIN_FAIL_REASON_INVALID_PASSWORD;

/** 401 response when the account is banned. */
export const AUTH_LOGIN_ACCOUNT_BANNED =
  AppErrorMessages.AUTH_LOGIN_ACCOUNT_BANNED;

/** Login history / audit reason for banned accounts. */
export const AUTH_LOGIN_FAIL_REASON_ACCOUNT_BANNED =
  AppErrorMessages.AUTH_LOGIN_FAIL_REASON_ACCOUNT_BANNED;

/** 403 when the client IP is blacklisted. */
export const AUTH_LOGIN_IP_ACCESS_DENIED =
  AppErrorMessages.AUTH_LOGIN_IP_ACCESS_DENIED;
