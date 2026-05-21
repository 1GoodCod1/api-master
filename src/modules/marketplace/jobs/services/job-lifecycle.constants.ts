import { JobStatus } from '@prisma/client';

export type JobLifecyclePhase =
  | 'PUBLISHED'
  | 'IN_PROGRESS'
  | 'COMPLETING'
  | 'COMPLETED';

export type JobCustomerAction =
  | 'CLOSE'
  | 'REQUEST_CLOSE'
  | 'SELECT_MASTER'
  | 'MANAGE_APPLICATIONS';

export type JobMasterAction = 'CONFIRM_CLOSE' | 'REJECT_CLOSE';

export const JOB_LIFECYCLE_ORDER: JobStatus[] = [
  JobStatus.OPEN,
  JobStatus.FOUND,
  JobStatus.PENDING_CLOSE,
  JobStatus.CLOSED,
];

export const ALLOWED_JOB_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  [JobStatus.OPEN]: [JobStatus.FOUND, JobStatus.CLOSED],
  [JobStatus.FOUND]: [JobStatus.PENDING_CLOSE],
  [JobStatus.PENDING_CLOSE]: [JobStatus.FOUND, JobStatus.CLOSED],
  [JobStatus.CLOSED]: [],
};

export function resolveJobLifecyclePhase(status: JobStatus): JobLifecyclePhase {
  switch (status) {
    case JobStatus.OPEN:
      return 'PUBLISHED';
    case JobStatus.FOUND:
      return 'IN_PROGRESS';
    case JobStatus.PENDING_CLOSE:
      return 'COMPLETING';
    case JobStatus.CLOSED:
      return 'COMPLETED';
  }
}

export function assertJobStatusTransition(
  from: JobStatus,
  to: JobStatus,
): void {
  if (!ALLOWED_JOB_TRANSITIONS[from].includes(to)) {
    throw new Error(`Invalid job status transition: ${from} -> ${to}`);
  }
}
