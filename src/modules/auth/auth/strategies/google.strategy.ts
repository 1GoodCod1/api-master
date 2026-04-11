import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import oauth2 from 'passport-oauth2';
import {
  Strategy,
  Profile,
  type StrategyOptionsWithRequest,
} from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

interface OAuthStatePayload {
  flow?: string;
  role?: string;
  nonce?: string;
}

class PreserveStateStore {
  store(
    _req: unknown,
    state: string | undefined,
    callback: (err: null, state: string | null) => void,
  ) {
    callback(null, state ?? null);
  }
  verify(
    _req: unknown,
    _state: string | undefined,
    callback: (err: null, ok: boolean) => void,
  ) {
    callback(null, true);
  }
}

export interface GoogleOAuthUser {
  provider: 'GOOGLE';
  providerId: string;
  email: string | undefined;
  firstName: string | undefined;
  lastName: string | undefined;
  picture: string | undefined;
  accessToken: string;
  role?: 'CLIENT' | 'MASTER';
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    const options: StrategyOptionsWithRequest = {
      clientID: configService.get<string>('oauth.google.clientId') || '',
      clientSecret:
        configService.get<string>('oauth.google.clientSecret') || '',
      callbackURL: configService.get<string>('oauth.google.callbackUrl') || '',
      tokenURL: 'https://oauth2.googleapis.com/token',
      userProfileURL: 'https://openidconnect.googleapis.com/v1/userinfo',
      scope: ['email', 'profile'],
      passReqToCallback: true,
      store: new PreserveStateStore() as unknown as oauth2.StateStore,
    };
    super(options);
  }

  validate(
    req: Request,
    accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): GoogleOAuthUser {
    const cookieState = (req.cookies as Record<string, string>)['oauth_state'];
    const queryState = req.query?.state as string | undefined;

    if (!cookieState || !queryState || cookieState !== queryState) {
      throw new UnauthorizedException('Invalid OAuth state');
    }

    let role: 'CLIENT' | 'MASTER' | undefined;
    try {
      const decoded = JSON.parse(
        Buffer.from(cookieState, 'base64url').toString('utf8'),
      ) as OAuthStatePayload;
      if (decoded.flow === 'login') {
        role = undefined;
      } else if (decoded.role === 'MASTER') {
        role = 'MASTER';
      } else if (decoded.role === 'CLIENT') {
        role = 'CLIENT';
      } else {
        role = undefined;
      }
    } catch {
      role = undefined;
    }

    const email: string | undefined = profile.emails?.[0]?.value;
    const firstName: string | undefined = profile.name?.givenName;
    const lastName: string | undefined = profile.name?.familyName;
    const picture: string | undefined = profile.photos?.[0]?.value;

    return {
      provider: 'GOOGLE',
      providerId: profile.id,
      email,
      firstName,
      lastName,
      picture,
      accessToken,
      role,
    };
  }
}
