import { TasksTariffService } from './services/tasks-tariff.service';
import { TasksAnalyticsService } from './services/tasks-analytics.service';
import { TasksMaintenanceService } from './services/tasks-maintenance.service';
import { TasksActivityService } from './services/tasks-activity.service';
import { TasksBookingReminderService } from './services/tasks-booking-reminder.service';
export declare class TasksService {
    private readonly tariffTasks;
    private readonly analyticsTasks;
    private readonly maintenanceTasks;
    private readonly activityTasks;
    private readonly bookingReminderTasks;
    private readonly logger;
    constructor(tariffTasks: TasksTariffService, analyticsTasks: TasksAnalyticsService, maintenanceTasks: TasksMaintenanceService, activityTasks: TasksActivityService, bookingReminderTasks: TasksBookingReminderService);
    handleDailyTasks(): Promise<void>;
    handleHourlyTasks(): Promise<void>;
    handleHalfHourTasks(): Promise<void>;
}
