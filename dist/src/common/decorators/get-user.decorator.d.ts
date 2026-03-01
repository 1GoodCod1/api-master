import type { Request } from 'express';
import type { JwtUser } from '../interfaces/jwt-user.interface';
export interface RequestWithUser extends Request {
    user: JwtUser;
}
export interface RequestWithOptionalUser extends Request {
    user?: JwtUser;
}
export declare const GetUser: (...dataOrPipes: (string | import("@nestjs/common").PipeTransform<any, any> | import("@nestjs/common").Type<import("@nestjs/common").PipeTransform<any, any>> | undefined)[]) => ParameterDecorator;
