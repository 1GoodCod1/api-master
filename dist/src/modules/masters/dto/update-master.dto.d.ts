import { CreateMasterDto } from './create-master.dto';
declare class TelegramChatIdDto {
    telegramChatId?: string;
}
declare class WhatsappPhoneDto {
    whatsappPhone?: string;
}
declare const UpdateMasterDto_base: import("@nestjs/common").Type<WhatsappPhoneDto & TelegramChatIdDto & Partial<CreateMasterDto>>;
export declare class UpdateMasterDto extends UpdateMasterDto_base {
}
export {};
