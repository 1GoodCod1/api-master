import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LeadsActionsService } from '../services/leads-actions.service';
import type { MasterAvailablePayload } from '../types';

export type { MasterAvailablePayload };

/**
 * Слушатель события «мастер снова доступен».
 * При смене статуса мастера на AVAILABLE (из кабинета мастера) отправляем
 * in-app уведомления клиентам, подписавшимся на «уведомить, когда станет доступен».
 */
@Injectable()
export class MasterAvailableListener {
  private readonly logger = new Logger(MasterAvailableListener.name);

  constructor(private readonly leadsActions: LeadsActionsService) {}

  @OnEvent('master.available', { async: true })
  async handleMasterAvailable(payload: MasterAvailablePayload) {
    try {
      await this.leadsActions.notifySubscribersAboutAvailability(
        payload.masterId,
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Ошибка при уведомлении подписчиков о доступности мастера ${payload.masterId}: ${msg}`,
      );
    }
  }
}
