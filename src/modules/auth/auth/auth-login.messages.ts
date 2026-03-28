/**
 * Login flow messages — single source for API responses, audit, and login history.
 * Client-facing strings should stay stable; internal reasons explain failures in logs.
 */
export const AUTH_LOGIN_INVALID_CREDENTIALS = 'Invalid credentials';

/** Stored in login history / audit when the user exists but the password does not match. */
export const AUTH_LOGIN_FAIL_REASON_INVALID_PASSWORD = 'Invalid password';

/** 401 response when the account is banned. */
export const AUTH_LOGIN_ACCOUNT_BANNED = 'Account is banned';

/** Login history / audit reason for banned accounts. */
export const AUTH_LOGIN_FAIL_REASON_ACCOUNT_BANNED = 'Account banned';

/** 403 when the client IP is blacklisted. */
export const AUTH_LOGIN_IP_ACCESS_DENIED = 'Access denied from this IP address';
