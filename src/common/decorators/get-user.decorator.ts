import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtUser } from '../interfaces/jwt-user.interface';

/** HTTP-запрос с обязательным `user` после прохождения JWT. */
export interface RequestWithUser extends Request {
  user: JwtUser;
}

/** Запрос с необязательным пользователем (опциональный JWT и т.п.). */
export interface RequestWithOptionalUser extends Request {
  user?: JwtUser;
}

/** Параметр-обёртка: текущий пользователь из `req.user` или поле по имени. */
export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();

    if (data) {
      return request.user[data as keyof JwtUser];
    }

    return request.user;
  },
);
