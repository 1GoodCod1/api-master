import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../shared/database/prisma.service';
type UploadFileResult = Awaited<ReturnType<FilesService['uploadFile']>>;
type UploadedDto = UploadFileResult extends {
    data: infer D;
} ? D : UploadFileResult;
export declare class FilesService {
    private readonly configService;
    private readonly prisma;
    constructor(configService: ConfigService, prisma: PrismaService);
    private isImage;
    private addToMasterGalleryIfPossible;
    private addToClientGalleryIfPossible;
    uploadFile(file: Express.Multer.File, userId?: string, options?: {
        skipClientGallery?: boolean;
    }): Promise<{
        id: string;
        path: string;
        url: string;
        filename: string;
        size: number;
        mimetype: string;
    }>;
    uploadMany(files: Express.Multer.File[], userId: string | null, options?: {
        skipClientGallery?: boolean;
    }): Promise<{
        items: UploadedDto[];
    }>;
    private getPhotoLimitForTariff;
}
export {};
