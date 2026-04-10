import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalSStrategy } from './strategies/local.strategy';
import { UsersModule } from '../../users/users.module';
import { PrismaModule } from '../../shared/database/prisma.module';
import { AuditModule } from '../../audit/audit.module';
import { CacheModule } from '../../shared/cache/cache.module';
import { EmailModule } from '../../email/email.module';
import { ReferralsModule } from '../../engagement/referrals/referrals.module';
import { ConsentModule } from '../../consent/consent.module';
import { TokenService } from './services/token.service';
import { RegistrationService } from './services/registration.service';
import { PasswordResetService } from './services/password-reset.service';
import { LoginService } from './services/login.service';
import { RefreshCookieService } from './services/refresh-cookie.service';
import { AuthLockoutService } from './services/auth-lockout.service';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('jwt.accessSecret'),
        signOptions: {
          expiresIn: configService.get('jwt.accessExpiry'),
        },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
    PrismaModule,
    AuditModule,
    CacheModule,
    EmailModule,
    ReferralsModule,
    ConsentModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalSStrategy,
    JwtStrategy,
    TokenService,
    RegistrationService,
    PasswordResetService,
    LoginService,
    RefreshCookieService,
    AuthLockoutService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
