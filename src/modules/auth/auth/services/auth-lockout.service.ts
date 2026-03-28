import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { AppErrors, AppErrorTemplates } from '../../../../common/errors';
import { RedisService } from '../../../shared/redis/redis.service';

/** Account lockout after 5 failed attempts for 15 minutes */
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_TTL_SEC = 15 * 60; // 15 minutes
const WINDOW_TTL_SEC = 15 * 60; // окно для подсчёта неудачных попыток

@Injectable()
export class AuthLockoutService {
  private readonly logger = new Logger(AuthLockoutService.name);

  constructor(private readonly redis: RedisService) {}

  private keyEmail(email: string): string {
    const normalized = String(email || '')
      .toLowerCase()
      .trim();
    return `auth:lockout:email:${normalized}`;
  }

  private keyIp(ip: string): string {
    return `auth:lockout:ip:${String(ip || '').trim()}`;
  }

  /**
   * Check if login is locked for this email or IP.
   * Throws ForbiddenException if locked.
   */
  async checkLocked(email: string, ipAddress?: string): Promise<void> {
    try {
      const emailKey = this.keyEmail(email);
      const raw = await this.redis.getClient().get(emailKey);
      const count = raw !== null ? parseInt(raw, 10) || 0 : 0;
      if (count >= LOCKOUT_THRESHOLD) {
        this.logger.warn(`Login locked for email (${count} failed attempts)`);
        throw AppErrors.forbidden(
          AppErrorTemplates.authLockoutEmail(Math.ceil(LOCKOUT_TTL_SEC / 60)),
        );
      }

      if (ipAddress) {
        const ipKey = this.keyIp(ipAddress);
        const ipRaw = await this.redis.getClient().get(ipKey);
        const ipCount = ipRaw !== null ? parseInt(ipRaw, 10) || 0 : 0;
        if (ipCount >= LOCKOUT_THRESHOLD * 2) {
          this.logger.warn(`Login locked for IP (${ipCount} failed attempts)`);
          throw AppErrors.forbidden(
            AppErrorTemplates.authLockoutIp(Math.ceil(LOCKOUT_TTL_SEC / 60)),
          );
        }
      }
    } catch (err) {
      if (err instanceof ForbiddenException) {
        throw err;
      }
      this.logger.error('checkLocked failed', err);
      throw err;
    }
  }

  /**
   * Record a failed login attempt. Call after password validation fails.
   * @param email - Only set when user exists (prevents locking non-existent emails)
   * @param ipAddress - Always recorded to prevent IP-based brute force
   */
  async recordFailed(
    email: string | undefined,
    ipAddress?: string,
  ): Promise<void> {
    try {
      const client = this.redis.getClient();

      if (email) {
        const emailKey = this.keyEmail(email);
        const count = await client.incr(emailKey);
        if (count === 1) {
          await this.redis.expire(emailKey, WINDOW_TTL_SEC);
        }
        this.logger.debug(
          `Failed login attempt ${count}/${LOCKOUT_THRESHOLD} for ${email}`,
        );
      }

      if (ipAddress) {
        const ipKey = this.keyIp(ipAddress);
        const ipCount = await client.incr(ipKey);
        if (ipCount === 1) {
          await this.redis.expire(ipKey, WINDOW_TTL_SEC);
        }
      }
    } catch (err) {
      this.logger.error('recordFailed failed', err);
      throw err;
    }
  }

  /**
   * Clear lockout on successful login.
   */
  async clearLockout(email: string, ipAddress?: string): Promise<void> {
    try {
      await this.redis.del(this.keyEmail(email));
      if (ipAddress) {
        await this.redis.del(this.keyIp(ipAddress));
      }
    } catch (err) {
      this.logger.error('clearLockout failed', err);
      throw err;
    }
  }
}
