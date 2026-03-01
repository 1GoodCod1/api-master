import { PipeTransform } from '@nestjs/common';
export declare class ValidateSlugPipe implements PipeTransform<string, string> {
    transform(value: string): string;
}
export declare class ValidateIdPipe implements PipeTransform<string, string> {
    transform(value: string): string;
}
export declare class ValidateParamPipe implements PipeTransform<string, string> {
    transform(value: string): string;
}
