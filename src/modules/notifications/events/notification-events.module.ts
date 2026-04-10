import { Global, Module } from '@nestjs/common';
import { NotificationEventEmitter } from './notification-event.emitter';

/**
 * Lightweight global module that exposes NotificationEventEmitter.
 *
 * Domain modules import nothing — they just inject NotificationEventEmitter
 * because this module is @Global(). The actual delivery is handled by
 * NotificationEventListener registered inside NotificationsModule.
 */
@Global()
@Module({
  providers: [NotificationEventEmitter],
  exports: [NotificationEventEmitter],
})
export class NotificationEventsModule {}
