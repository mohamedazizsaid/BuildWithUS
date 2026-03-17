import { Controller, UseFilters } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { GrpcExceptionFilter } from '@winaity/shared-kernel';
import {
  TemplateCommandServiceController,
  TemplateCommandServiceControllerMethods,
  CreateTemplateRequest,
  CreateTemplateResponse,
  UpdateTemplateRequest,
  UpdateTemplateResponse,
  DeleteTemplateRequest,
  DeleteTemplateResponse,
} from 'proto/generated/template_commands';
import {
  CreateTemplateCommand,
  UpdateTemplateCommand,
  DeleteTemplateCommand,
} from '../../application/commands/index.js';
import { Template } from '../../domain/entities/template.aggregate.js';
import { TemplateGrpcMapper } from './template.grpc-mapper.js';

/**
 * Template Commands gRPC Controller
 *
 * Handles all write operations for templates via gRPC.
 * Uses @UseFilters(GrpcExceptionFilter) for centralized error handling.
 */
@Controller()
@UseFilters(GrpcExceptionFilter)
@TemplateCommandServiceControllerMethods()
export class TemplatesCommandsGrpcController implements TemplateCommandServiceController {
  constructor(private readonly commandBus: CommandBus) {}

  /**
   * Create a new template
   */
  async createTemplate(request: CreateTemplateRequest): Promise<CreateTemplateResponse> {
    const command = new CreateTemplateCommand(
      request.userId,
      request.tenantId || '',
      request.name,
      request.description,
      request.type,
      request.subject,
      request.content,
      request.channelContents,
      request.channels,
    );

    const template = await this.commandBus.execute<CreateTemplateCommand, Template>(command);

    return {
      success: true,
      message: 'Template created successfully',
      template: TemplateGrpcMapper.toDto(template),
    };
  }

  /**
   * Update an existing template
   */
  async updateTemplate(request: UpdateTemplateRequest): Promise<UpdateTemplateResponse> {
    const command = new UpdateTemplateCommand(
      request.id,
      request.userId,
      request.tenantId || '',
      request.name,
      request.description,
      request.subject,
      request.content,
      request.channelContents,
      request.channels,
    );

    const template = await this.commandBus.execute<UpdateTemplateCommand, Template>(command);

    return {
      success: true,
      message: 'Template updated successfully',
      template: TemplateGrpcMapper.toDto(template),
    };
  }

  /**
   * Delete a template (soft delete)
   */
  async deleteTemplate(request: DeleteTemplateRequest): Promise<DeleteTemplateResponse> {
    const command = new DeleteTemplateCommand(request.id, request.userId, request.tenantId || '');

    await this.commandBus.execute<DeleteTemplateCommand, void>(command);

    return {
      success: true,
      message: 'Template deleted successfully',
    };
  }
}
