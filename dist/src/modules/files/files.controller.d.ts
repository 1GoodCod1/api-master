import { FilesService } from './files.service';
import type { RequestWithOptionalUser, RequestWithUser } from '../../common/decorators/get-user.decorator';
export declare class FilesController {
    private readonly filesService;
    constructor(filesService: FilesService);
    uploadFile(file: Express.Multer.File, req: RequestWithUser): Promise<{
        id: string;
        path: string;
        url: string;
        filename: string;
        size: number;
        mimetype: string;
    }>;
    uploadMany(files: Express.Multer.File[], req: RequestWithOptionalUser, forLead?: string): Promise<{
        items: {
            id: string;
            path: string;
            url: string;
            filename: string;
            size: number;
            mimetype: string;
        }[];
    }>;
}
