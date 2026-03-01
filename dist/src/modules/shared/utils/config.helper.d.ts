import { ConfigService } from '@nestjs/config';
export declare class ConfigHelper {
    static getString(configService: ConfigService, key: string, defaultValue?: string): string;
    static getNumber(configService: ConfigService, key: string, defaultValue?: number): number;
    static getBoolean(configService: ConfigService, key: string, defaultValue?: boolean): boolean;
}
