import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseBoolPipe implements PipeTransform<string, boolean> {
  transform(value: string): boolean {
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;

    throw new BadRequestException(
      'Validation failed (boolean string is expected)',
    );
  }
}
