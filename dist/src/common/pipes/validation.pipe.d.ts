import { PipeTransform, ArgumentMetadata } from '@nestjs/common';
export declare class ValidationPipe implements PipeTransform {
    transform(value: unknown, { metatype }: ArgumentMetadata): Promise<unknown>;
    private toValidate;
    private formatErrors;
}
