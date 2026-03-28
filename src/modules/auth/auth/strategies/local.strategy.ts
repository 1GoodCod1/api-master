import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { AppErrors, AppErrorMessages } from '../../../../common/errors';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalSStrategy extends PassportStrategy(LocalStrategy) {
  constructor(private readonly authService: AuthService) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- PassportStrategy/LocalStrategy types from passport-local
    super({
      usernameField: 'email',
    });
  }

  async validate(email: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(email, password);

    if (!user) {
      throw AppErrors.unauthorized(
        AppErrorMessages.AUTH_LOGIN_INVALID_CREDENTIALS,
      );
    }

    return user;
  }
}
