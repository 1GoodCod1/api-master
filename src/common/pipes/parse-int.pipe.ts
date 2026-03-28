import { PipeTransform, Injectable } from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../errors';

@Injectable()
export class ParseIntPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const val = parseInt(value, 10);

    if (isNaN(val)) {
      throw AppErrors.badRequest(AppErrorMessages.PARSE_INT_EXPECTED);
    }

    return val;
  }
}
