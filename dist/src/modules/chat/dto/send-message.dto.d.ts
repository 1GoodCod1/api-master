export declare class SendMessageDto {
    content: string;
    fileIds?: string[];
}
export declare class SendMessageWsDto extends SendMessageDto {
    conversationId: string;
}
