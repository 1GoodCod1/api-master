import { ConfigService } from '@nestjs/config';
export declare class EncryptionService {
    private readonly configService;
    private readonly algorithm;
    private readonly keyLength;
    private readonly ivLength;
    private readonly tagLength;
    private encryptionKey;
    constructor(configService: ConfigService);
    encrypt(text: string): string;
    decrypt(encryptedText: string): string;
    hash(text: string): string;
    maskPhone(phone: string): string;
    generateCode(length?: number): string;
    generateToken(length?: number): string;
}
