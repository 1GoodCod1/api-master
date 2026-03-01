"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const client_1 = require("@prisma/client");
let PrismaExceptionFilter = class PrismaExceptionFilter extends core_1.BaseExceptionFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        if (exception instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            switch (exception.code) {
                case 'P2002':
                    response.status(common_1.HttpStatus.CONFLICT).json({
                        statusCode: common_1.HttpStatus.CONFLICT,
                        message: 'Unique constraint violation',
                        fields: exception.meta?.target,
                    });
                    break;
                case 'P2025':
                    response.status(common_1.HttpStatus.NOT_FOUND).json({
                        statusCode: common_1.HttpStatus.NOT_FOUND,
                        message: 'Record not found',
                    });
                    break;
                case 'P2003':
                    response.status(common_1.HttpStatus.BAD_REQUEST).json({
                        statusCode: common_1.HttpStatus.BAD_REQUEST,
                        message: 'Foreign key constraint failed',
                    });
                    break;
                default:
                    super.catch(exception, host);
            }
        }
        else {
            super.catch(exception, host);
        }
    }
};
exports.PrismaExceptionFilter = PrismaExceptionFilter;
exports.PrismaExceptionFilter = PrismaExceptionFilter = __decorate([
    (0, common_1.Catch)()
], PrismaExceptionFilter);
//# sourceMappingURL=prisma-exception.filter.js.map