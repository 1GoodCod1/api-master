import {
  Controller,
  Post,
  Get,
  Head,
  Body,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { WebVitalDto } from './web-vitals.dto';
import { CONTROLLER_PATH } from '../../../common/constants';

@Controller(CONTROLLER_PATH.webVitals)
export class WebVitalsController {
  private readonly logger = new Logger(WebVitalsController.name);

  @Get()
  @Head()
  @HttpCode(204)
  probe(): void {}

  @Post()
  @HttpCode(204)
  report(@Body() dto: WebVitalDto) {
    this.logger.debug(
      `[${dto.name}] value=${dto.value} rating=${dto.rating} delta=${dto.delta}`,
    );
  }
}
