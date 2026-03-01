import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';

interface JwtPayload {
  sub: string;
  role?: string;
}

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
        throw new WsException('Unauthorized');
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get('jwt.accessSecret'),
      });

      const data = client.data as { userId?: string; userRole?: string };
      data.userId = payload.sub;
      data.userRole = payload.role;

      return true;
    } catch {
      throw new WsException('Unauthorized');
    }
  }

  private extractTokenFromSocket(client: Socket): string | null {
    const token: unknown =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.split(' ')[1];
    return typeof token === 'string' ? token : null;
  }
}
