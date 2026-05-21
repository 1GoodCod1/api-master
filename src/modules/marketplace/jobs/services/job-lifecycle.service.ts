import { Injectable } from '@nestjs/common';
import {
  CompanyMemberStatus,
  CompanyRole,
  JobStatus,
  NotificationCategory,
} from '@prisma/client';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotificationEventEmitter } from '../../../notifications/events';
import {
  resolveJobLifecyclePhase,
  type JobCustomerAction,
  type JobLifecyclePhase,
  type JobMasterAction,
} from './job-lifecycle.constants';

type JobStakeholderRef = {
  id: string;
  title: string;
  clientId: string;
  companyId: string | null;
  status: JobStatus;
  selectedApplicationId: string | null;
};

export type JobLifecycleSnapshot = {
  status: JobStatus;
  phase: JobLifecyclePhase;
  applicationCount: number;
  hasSelectedMaster: boolean;
  customerActions: JobCustomerAction[];
  masterActions: JobMasterAction[];
};

type NotifyStakeholdersInput = {
  job: JobStakeholderRef;
  category: NotificationCategory;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  excludeUserIds?: string[];
};

@Injectable()
export class JobLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationEvents: NotificationEventEmitter,
  ) {}

  buildSnapshot(
    job: Pick<JobStakeholderRef, 'status' | 'selectedApplicationId'>,
    applicationCount: number,
  ): JobLifecycleSnapshot {
    const customerActions: JobCustomerAction[] = [];
    const masterActions: JobMasterAction[] = [];

    switch (job.status) {
      case JobStatus.OPEN:
        customerActions.push('CLOSE', 'MANAGE_APPLICATIONS');
        if (applicationCount > 0) {
          customerActions.push('SELECT_MASTER');
        }
        break;
      case JobStatus.FOUND:
        customerActions.push('REQUEST_CLOSE', 'MANAGE_APPLICATIONS');
        break;
      case JobStatus.PENDING_CLOSE:
        customerActions.push('MANAGE_APPLICATIONS');
        masterActions.push('CONFIRM_CLOSE', 'REJECT_CLOSE');
        break;
      case JobStatus.CLOSED:
        break;
    }

    return {
      status: job.status,
      phase: resolveJobLifecyclePhase(job.status),
      applicationCount,
      hasSelectedMaster: Boolean(job.selectedApplicationId),
      customerActions,
      masterActions,
    };
  }

  async notifyStakeholders(input: NotifyStakeholdersInput): Promise<void> {
    const exclude = new Set(input.excludeUserIds ?? []);
    const recipientIds = await this.collectStakeholderUserIds(input.job);

    for (const userId of recipientIds) {
      if (exclude.has(userId)) continue;

      this.notificationEvents.notify({
        userId,
        category: input.category,
        title: input.title,
        message: input.message,
        metadata: {
          jobId: input.job.id,
          companyId: input.job.companyId,
          status: input.job.status,
          ...input.metadata,
        },
      });
    }
  }

  private async collectStakeholderUserIds(
    job: Pick<JobStakeholderRef, 'clientId' | 'companyId'>,
  ): Promise<string[]> {
    const recipientIds = new Set<string>([job.clientId]);

    if (job.companyId) {
      const members = await this.prisma.companyMember.findMany({
        where: {
          companyId: job.companyId,
          leftAt: null,
          status: CompanyMemberStatus.ACTIVE,
          role: {
            in: [CompanyRole.OWNER, CompanyRole.MANAGER, CompanyRole.MEMBER],
          },
        },
        select: { userId: true },
      });

      for (const member of members) {
        recipientIds.add(member.userId);
      }
    }

    return Array.from(recipientIds);
  }
}
