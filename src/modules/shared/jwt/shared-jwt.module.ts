import { DynamicModule, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Centralised JWT configuration.
 *
 * - `forSign()` — full config (secret + expiry), used by AuthModule to issue tokens.
 * - `forVerify()` — secret only, used by WebSocket / Chat gateways to validate tokens.
 */
@Module({})
export class SharedJwtModule {
  static forSign(): DynamicModule {
    return {
      module: SharedJwtModule,
      imports: [
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: (config: ConfigService) => ({
            secret: config.get('jwt.accessSecret'),
            signOptions: {
              expiresIn: config.get('jwt.accessExpiry'),
            },
          }),
          inject: [ConfigService],
        }),
      ],
      exports: [JwtModule],
    };
  }

  static forVerify(): DynamicModule {
    return {
      module: SharedJwtModule,
      imports: [
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: (config: ConfigService) => ({
            secret: config.get('jwt.accessSecret'),
          }),
          inject: [ConfigService],
        }),
      ],
      exports: [JwtModule],
    };
  }
}
