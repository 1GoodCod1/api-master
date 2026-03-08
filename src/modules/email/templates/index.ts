import type { TemplateFn } from './types';
import { welcome1 } from './welcome-1';
import { welcome2 } from './welcome-2';
import { leadCreated } from './lead-created';
import { leadFollowup } from './lead-followup';
import { reviewRequest } from './review-request';
import { reengagement } from './reengagement';
import { masterWelcome1 } from './master-welcome-1';
import { masterWelcome2 } from './master-welcome-2';
import { bookingReminder24h } from './booking-reminder-24h';
import { digestClient } from './digest-client';
import { digestMaster } from './digest-master';
import { passwordReset } from './password-reset';
import { newFeatureMasters } from './new-feature-masters';

export type { TemplateContext, TemplateFn } from './types';

export const TEMPLATES: Record<string, TemplateFn> = {
  'welcome-1': welcome1,
  'welcome-2': welcome2,
  'lead-created': leadCreated,
  'lead-followup': leadFollowup,
  'review-request': reviewRequest,
  reengagement,
  'master-welcome-1': masterWelcome1,
  'master-welcome-2': masterWelcome2,
  'booking-reminder-24h': bookingReminder24h,
  'digest-client': digestClient,
  'digest-master': digestMaster,
  'password-reset': passwordReset,
  'new-feature-masters': newFeatureMasters,
};
