import { PrismaService } from '../../shared/database/prisma.service';
export declare class MastersPhotosService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getMasterPhotos(masterIdOrSlug: string, limit?: number): Promise<{
        avatarFileId: string | null;
        items: {
            id: string;
        }[];
    }>;
    getMyPhotos(userId: string): Promise<{
        avatarFileId: string | null;
        items: {
            path: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            filename: string;
            mimetype: string;
            size: number;
            uploadedById: string | null;
        }[];
    }>;
    removeMyPhoto(userId: string, fileId: string, onCacheInvalidate?: (masterId: string, slug: string | null) => Promise<void>): Promise<{
        ok: boolean;
    }>;
    setMyAvatar(userId: string, fileId: string, onCacheInvalidate?: (masterId: string, slug: string | null) => Promise<void>): Promise<{
        ok: boolean;
    }>;
}
