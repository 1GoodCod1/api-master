import { Module, type Type } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { SharedJwtModule } from '../../shared/jwt/shared-jwt.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { OAuthController } from './oauth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalSStrategy } from './strategies/local.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
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
import { OAuthService } from './services/oauth.service';
import { OAuthPassportFlowService } from './services/oauth-passport-flow.service';

/** Регистрируем OAuth-стратегии только при заданных client id. */
function oauthStrategyProviders(): Array<Type<GoogleStrategy>> {
  const list: Array<Type<GoogleStrategy>> = [];
  if (process.env.GOOGLE_CLIENT_ID?.trim()) {
    list.push(GoogleStrategy);
  }
  return list;
}

@Module({
  imports: [
    UsersModule,
    PassportModule,
    SharedJwtModule.forSign(),
    ConfigModule,
    PrismaModule,
    AuditModule,
    CacheModule,
    EmailModule,
    ReferralsModule,
    ConsentModule,
  ],
  controllers: [AuthController, OAuthController],
  providers: [
    AuthService,
    LocalSStrategy,
    JwtStrategy,
    ...oauthStrategyProviders(),
    TokenService,
    RegistrationService,
    PasswordResetService,
    LoginService,
    RefreshCookieService,
    AuthLockoutService,
    OAuthService,
    OAuthPassportFlowService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
