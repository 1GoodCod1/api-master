"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilesModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const uuid_1 = require("uuid");
const client_s3_1 = require("@aws-sdk/client-s3");
const multer_s3_1 = __importDefault(require("multer-s3"));
const files_service_1 = require("./files.service");
const getExt = (p) => (0, path_1.extname)(p);
const nextUuid = () => uuid_1.v4();
const B2_REGION_REGEX = /^[a-z]{2}-[a-z]+-\d{3}$/;
function getValidB2Region(region) {
    if (typeof region !== 'string' || !region)
        return 'eu-central-003';
    if (!B2_REGION_REGEX.test(region))
        return 'eu-central-003';
    return region;
}
function getB2Endpoint(region) {
    return `https://s3.${region}.backblazeb2.com`;
}
function getValidB2Endpoint(custom, fallback) {
    if (typeof custom !== 'string' || !custom.trim())
        return fallback;
    try {
        const u = new URL(custom.trim());
        if (u.protocol !== 'https:')
            return fallback;
        if (!u.hostname.endsWith('.backblazeb2.com'))
            return fallback;
        return u.origin;
    }
    catch {
        return fallback;
    }
}
const files_controller_1 = require("./files.controller");
const prisma_module_1 = require("../shared/database/prisma.module");
const FILE_FILTER = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const isValid = allowedTypes.test(getExt(file.originalname).toLowerCase());
    cb(isValid ? null : new Error('Invalid file type'), isValid);
};
let FilesModule = class FilesModule {
};
exports.FilesModule = FilesModule;
exports.FilesModule = FilesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            platform_express_1.MulterModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => {
                    const logger = new common_1.Logger('FilesModule');
                    const maxFileSize = 10 * 1024 * 1024;
                    const b2KeyId = configService.get('b2.applicationKeyId');
                    const b2Key = configService.get('b2.applicationKey');
                    const b2Bucket = configService.get('b2.bucket');
                    const useB2 = !!(b2KeyId && b2Key && b2Bucket);
                    if (useB2) {
                        const b2Region = getValidB2Region(configService.get('b2.region'));
                        const defaultEndpoint = getB2Endpoint(b2Region);
                        const endpoint = getValidB2Endpoint(configService.get('b2.endpoint'), defaultEndpoint);
                        const s3 = new client_s3_1.S3Client({
                            credentials: {
                                accessKeyId: b2KeyId,
                                secretAccessKey: b2Key,
                            },
                            region: b2Region,
                            endpoint,
                            forcePathStyle: true,
                        });
                        s3.middlewareStack.add((next) => (args) => {
                            const input = args.input;
                            if (input && 'ACL' in input)
                                delete input.ACL;
                            return next(args);
                        }, { step: 'initialize', name: 'stripACL' });
                        logger.log(`Storage: Backblaze B2 (bucket=${b2Bucket}, region=${b2Region}, endpoint=${endpoint})`);
                        return {
                            storage: (0, multer_s3_1.default)({
                                s3,
                                bucket: b2Bucket,
                                key: (_req, file, cb) => {
                                    const filename = `${nextUuid()}${getExt(file.originalname)}`;
                                    cb(null, `uploads/${filename}`);
                                },
                            }),
                            limits: { fileSize: maxFileSize },
                            fileFilter: FILE_FILTER,
                        };
                    }
                    logger.warn('Storage: LOCAL disk (./uploads). Set B2_APPLICATION_KEY_ID, B2_APPLICATION_KEY, and B2_BUCKET to use Backblaze B2.');
                    return {
                        storage: (0, multer_1.diskStorage)({
                            destination: './uploads',
                            filename: (req, file, cb) => {
                                const filename = `${nextUuid()}${getExt(file.originalname)}`;
                                cb(null, filename);
                            },
                        }),
                        limits: { fileSize: maxFileSize },
                        fileFilter: FILE_FILTER,
                    };
                },
                inject: [config_1.ConfigService],
            }),
            config_1.ConfigModule,
            prisma_module_1.PrismaModule,
        ],
        controllers: [files_controller_1.FilesController],
        providers: [files_service_1.FilesService],
        exports: [files_service_1.FilesService],
    })
], FilesModule);
//# sourceMappingURL=files.module.js.map