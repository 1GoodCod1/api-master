import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { CreateConversationDto, SendMessageDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { RequestWithUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Chat')
@Controller('conversations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get()
  @Roles('CLIENT', 'MASTER', 'ADMIN')
  @ApiOperation({ summary: 'Get all conversations for authenticated user' })
  @ApiResponse({ status: 200, description: 'List of conversations' })
  async getConversations(@Req() req: RequestWithUser) {
    return this.chatService.getConversations(req.user);
  }

  @Get('unread-count')
  @Roles('CLIENT', 'MASTER')
  @ApiOperation({ summary: 'Get unread messages count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async getUnreadCount(@Req() req: RequestWithUser) {
    return this.chatService.getUnreadCount(req.user);
  }

  @Get('by-lead/:leadId')
  @Roles('CLIENT', 'MASTER', 'ADMIN')
  @ApiOperation({ summary: 'Get conversation by lead ID' })
  @ApiResponse({ status: 200, description: 'Conversation details or null' })
  async getConversationByLeadId(
    @Param('leadId') leadId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.chatService.getConversationByLeadId(leadId, req.user);
  }

  @Get(':id')
  @Roles('CLIENT', 'MASTER', 'ADMIN')
  @ApiOperation({ summary: 'Get conversation details' })
  @ApiResponse({ status: 200, description: 'Conversation details' })
  async getConversation(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.chatService.getConversation(id, req.user);
  }

  @Get(':id/messages')
  @Roles('CLIENT', 'MASTER', 'ADMIN')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: String,
    description:
      'Cursor-based pagination: pass message id to fetch older messages',
  })
  @ApiResponse({ status: 200, description: 'List of messages with pagination' })
  async getMessages(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.chatService.getMessages(
      id,
      req.user,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
      cursor,
    );
  }

  @Post()
  @Roles('CLIENT', 'MASTER', 'ADMIN')
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({ status: 201, description: 'Conversation created' })
  async createConversation(
    @Body() dto: CreateConversationDto,
    @Req() req: RequestWithUser,
  ) {
    return this.chatService.createConversation(dto, req.user);
  }

  @Post(':id/messages')
  @Roles('CLIENT', 'MASTER', 'ADMIN')
  @ApiOperation({ summary: 'Send a message in a conversation' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  async sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Req() req: RequestWithUser,
  ) {
    const { message: primary, autoReply } = await this.chatService.sendMessage(
      id,
      dto,
      req.user,
    );
    this.chatGateway.emitToConversation(id, 'chat:message', {
      ...primary,
      conversationId: id,
    });
    this.chatGateway.notifyNewMessage(primary, id);
    if (autoReply) {
      this.chatGateway.emitToConversation(id, 'chat:message', {
        ...autoReply,
        conversationId: id,
      });
      this.chatGateway.notifyNewMessage(autoReply, id);
    }
    return primary;
  }

  @Patch(':id/read')
  @Roles('CLIENT', 'MASTER', 'ADMIN')
  @ApiOperation({ summary: 'Mark messages as read' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  async markAsRead(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.chatService.markAsRead(id, req.user);
  }

  @Patch(':id/close')
  @Roles('MASTER', 'ADMIN')
  @ApiOperation({ summary: 'Close a conversation' })
  @ApiResponse({ status: 200, description: 'Conversation closed' })
  async closeConversation(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.chatService.closeConversation(id, req.user);
  }
}
