import { ValidationArguments, ValidatorConstraintInterface } from 'class-validator';
export declare class ValidTimeRangeConstraint implements ValidatorConstraintInterface {
    validate(_value: unknown, args: ValidationArguments): boolean;
    defaultMessage(): string;
}
export declare class CreateBookingDto {
    masterId: string;
    startTime: string;
    endTime: string;
    notes?: string;
    leadId?: string;
}
