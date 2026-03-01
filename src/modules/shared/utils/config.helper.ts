import { ConfigService } from '@nestjs/config';

export class ConfigHelper {
  static getString(
    configService: ConfigService,
    key: string,
    defaultValue: string = '',
  ): string {
    const value = configService.get<string>(key);
    return value || defaultValue;
  }

  static getNumber(
    configService: ConfigService,
    key: string,
    defaultValue: number = 0,
  ): number {
    const value = configService.get<number>(key);
    return value || defaultValue;
  }

  static getBoolean(
    configService: ConfigService,
    key: string,
    defaultValue: boolean = false,
  ): boolean {
    const value = configService.get<boolean>(key);
    return value !== undefined ? value : defaultValue;
  }
}
