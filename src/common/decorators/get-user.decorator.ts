import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtUser } from '../interfaces/jwt-user.interface';

export interface RequestWithUser extends Request {
  user: JwtUser;
}

export interface RequestWithOptionalUser extends Request {
  user?: JwtUser;
}

export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();

    if (data) {
      return request.user[data as keyof JwtUser];
    }

    return request.user;
  },
);
