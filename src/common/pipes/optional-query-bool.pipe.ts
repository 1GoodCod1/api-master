import { Injectable, PipeTransform } from '@nestjs/common';

/**
 * Query string → boolean | undefined.
 * Only "true" / "false" apply a filter; missing, empty, or other → undefined.
 */
@Injectable()
export class OptionalQueryBoolPipe implements PipeTransform<
  string | undefined,
  boolean | undefined
> {
  transform(value: string | undefined): boolean | undefined {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  }
}
