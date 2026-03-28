import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { AppErrors, AppErrorTemplates } from '../errors';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import type { ClassConstructor } from 'class-transformer';

@Injectable()
export class ValidationPipe implements PipeTransform {
  async transform(
    value: unknown,
    { metatype }: ArgumentMetadata,
  ): Promise<unknown> {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(
      metatype as ClassConstructor<object>,
      value as object,
    );
    const errors = await validate(object);

    if (errors.length > 0) {
      const formattedErrors = this.formatErrors(errors);
      throw AppErrors.badRequest({
        message: AppErrorTemplates.validationFailed(),
        errors: formattedErrors,
      });
    }

    return object;
  }

  private toValidate(metatype: new (...args: unknown[]) => unknown): boolean {
    const types: (new (...args: unknown[]) => unknown)[] = [
      String,
      Boolean,
      Number,
      Array,
      Object,
    ];
    return !types.includes(metatype);
  }

  private formatErrors(errors: ValidationError[]): Record<string, unknown> {
    return errors.reduce((acc, err) => {
      if (err.children && err.children.length > 0) {
        acc[err.property] = this.formatErrors(err.children);
      } else {
        acc[err.property] = Object.values(err.constraints ?? {});
      }
      return acc;
    }, {});
  }
}
