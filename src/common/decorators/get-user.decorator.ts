import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { CompanyMemberStatus, CompanyRole } from '@prisma/client';
import type { Request } from 'express';
import type { JwtUser } from '../interfaces/jwt-user.interface';

/** HTTP-запрос с обязательным `user` после прохождения JWT. */
export interface RequestWithUser extends Request {
  user: JwtUser;
}

export type ResolvedCompanyContext = {
  companyId: string;
  membership: {
    id: string;
    companyId: string;
    role: CompanyRole;
    status: CompanyMemberStatus;
  };
};

/** HTTP-запрос с опциональным company context после interceptor. */
export interface RequestWithCompanyContext extends RequestWithUser {
  companyContext?: ResolvedCompanyContext | null;
}

/** Запрос с необязательным пользователем (опциональный JWT и т.п.). */
export interface RequestWithOptionalUser extends Request {
  user?: JwtUser;
  companyContext?: ResolvedCompanyContext | null;
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
