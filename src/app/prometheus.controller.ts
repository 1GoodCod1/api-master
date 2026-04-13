import { Controller } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrometheusController } from '@willsoto/nestjs-prometheus';

/** Переопределяем стандартный контроллер Prometheus, чтобы исключить /metrics из throttler'а. */
@SkipThrottle()
@Controller('metrics')
export class CustomPrometheusController extends PrometheusController {}
