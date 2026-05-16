import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { UserRole } from '@prisma/client';
import { CacheService } from '../../../shared/cache/cache.service';
import type { JwtUser } from '../../../../common/interfaces/jwt-user.interface';
import { QueryJobsDto } from '../dto/query-jobs.dto';

@Injectable()
export class JobsCacheService {
  constructor(private readonly cache: CacheService) {}

  jobsListKey(dto: QueryJobsDto, user?: JwtUser): string {
    const scope =
      user?.role === UserRole.CLIENT
        ? `client:${user.id}`
        : user?.role === UserRole.MASTER
          ? `master:${user.id}`
          : 'public';
    const payload = JSON.stringify({ scope, dto: dto ?? {} });
    const hash = createHash('sha1').update(payload).digest('hex').slice(0, 16);
    return `cache:jobs:list:${hash}`;
  }

  jobByIdKey(jobId: string): string {
    return `cache:jobs:by-id:${jobId}`;
  }

  leaderboardKey(jobId: string): string {
    return `cache:jobs:leaderboard:${jobId}`;
  }

  async invalidateJobCaches(jobId?: string): Promise<void> {
    const tasks: Promise<unknown>[] = [
      this.cache.invalidate('cache:jobs:list:*'),
    ];
    if (jobId) {
      tasks.push(this.cache.del(this.jobByIdKey(jobId)));
      tasks.push(this.cache.del(this.leaderboardKey(jobId)));
    }
    await Promise.all(tasks);
  }
}
