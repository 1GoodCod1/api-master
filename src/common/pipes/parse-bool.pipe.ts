import { PipeTransform, Injectable } from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../errors';

@Injectable()
export class ParseBoolPipe implements PipeTransform<string, boolean> {
  transform(value: string): boolean {
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;

    throw AppErrors.badRequest(AppErrorMessages.PARSE_BOOL_EXPECTED);
  }
}
