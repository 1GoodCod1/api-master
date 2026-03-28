import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AppErrors, AppErrorMessages } from '../errors';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';
import type { WsJwtGuardPayload } from '../../modules/infrastructure/websocket/types';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = this.extractTokenFromSocket(client);

      if (!token) {
        throw AppErrors.ws(AppErrorMessages.WS_UNAUTHORIZED);
      }

      const payload = await this.jwtService.verifyAsync<WsJwtGuardPayload>(
        token,
        {
          secret: this.configService.get('jwt.accessSecret'),
        },
      );

      const data = client.data as { userId?: string; userRole?: string };
      data.userId = payload.sub;
      data.userRole = payload.role;

      return true;
    } catch {
      throw AppErrors.ws(AppErrorMessages.WS_UNAUTHORIZED);
    }
  }

  private extractTokenFromSocket(client: Socket): string | null {
    const token: unknown =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.split(' ')[1];
    return typeof token === 'string' ? token : null;
  }
}
