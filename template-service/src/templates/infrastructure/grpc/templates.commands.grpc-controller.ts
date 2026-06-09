import { Controller, UseFilters } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { GrpcMethod } from '@nestjs/microservices';
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
  UpdateTenantVariablesRequest,
  UpdateTenantVariablesResponse,
  AddTenantVariableRequest,
  AddTenantVariableResponse,
  DeleteTenantVariableRequest,
  DeleteTenantVariableResponse,
} from 'proto/generated/template_commands';
import {
  CreateTemplateCommand,
  UpdateTemplateCommand,
  DeleteTemplateCommand,
  DuplicateTemplateCommand,
  ToggleFavoriteCommand,
} from '../../application/commands/index.js';
import { UpdateTenantVariablesCommand } from '../../application/commands/update-tenant-variables.command.js';
import { AddTenantVariableCommand } from '../../application/commands/add-tenant-variable.command.js';
import { DeleteTenantVariableCommand } from '../../application/commands/delete-tenant-variable.command.js';
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
    // TODO: tenant_id will come from JWT via API Gateway. For now, accept from request.
    const req = request as any;
    const tenantId = req.tenantId || req.tenant_id || req.tenantid || '';
    if (!tenantId) {
      throw new Error('tenant_id is required');
    }
    const command = new CreateTemplateCommand(
      request.userId,
      tenantId,
      request.name,
      request.description,
      request.type,
      request.subject,
      request.content,
      request.channelContents,
      request.channels,
      req.isPredefinedOverride || req.is_predefined_override || false,
      req.predefinedTemplateId || req.predefined_template_id || '',
      req.externalOrgRef || req.external_org_ref || null,
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
      (request as any).tenantId || (request as any).tenant_id || '',
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
    const command = new DeleteTemplateCommand(request.id, request.userId, (request as any).tenantId || (request as any).tenant_id || '');

    await this.commandBus.execute<DeleteTemplateCommand, void>(command);

    return {
      success: true,
      message: 'Template deleted successfully',
    };
  }

  /**
   * Duplicate a template
   */
  @GrpcMethod('TemplateCommandService', 'DuplicateTemplate')
  async duplicateTemplate(request: any): Promise<any> {
    const tenantId = request.tenantId || request.tenant_id || '';
    const command = new DuplicateTemplateCommand(
      request.id,
      request.userId || request.user_id,
      tenantId,
      request.name,
    );

    const template = await this.commandBus.execute<DuplicateTemplateCommand, Template>(command);

    return {
      success: true,
      message: 'Template duplicated successfully',
      template: TemplateGrpcMapper.toDto(template),
    };
  }

  /**
   * Add a single tenant custom variable
   */
  async addTenantVariable(request: AddTenantVariableRequest): Promise<AddTenantVariableResponse> {
    const tenantId = (request as any).tenantId || (request as any).tenant_id || '';
    const category = (request as any).category || '';
    const name = (request as any).name || '';
    const command = new AddTenantVariableCommand(tenantId, category, name);
    return this.commandBus.execute<AddTenantVariableCommand, AddTenantVariableResponse>(command);
  }

  /**
   * Delete a single tenant custom variable
   */
  async deleteTenantVariable(request: DeleteTenantVariableRequest): Promise<DeleteTenantVariableResponse> {
    const tenantId = (request as any).tenantId || (request as any).tenant_id || '';
    const name = (request as any).name || '';
    const command = new DeleteTenantVariableCommand(tenantId, name);
    return this.commandBus.execute<DeleteTenantVariableCommand, DeleteTenantVariableResponse>(command);
  }

  /**
   * Update tenant custom variables
   */
  async updateTenantVariables(request: UpdateTenantVariablesRequest): Promise<UpdateTenantVariablesResponse> {
    const tenantId = (request as any).tenantId || (request as any).tenant_id || '';
    const json = (request as any).customVariablesJson || (request as any).custom_variables_json || '{}';
    const customVariables = JSON.parse(json);
    const command = new UpdateTenantVariablesCommand(tenantId, customVariables);
    return this.commandBus.execute<UpdateTenantVariablesCommand, UpdateTenantVariablesResponse>(command);
  }

  /**
   * Toggle favorite status on a template
   */
  @GrpcMethod('TemplateCommandService', 'ToggleFavorite')
  async toggleFavorite(request: any): Promise<any> {
    const tenantId = request.tenantId || request.tenant_id || '';
    const isFavorite = Boolean(
      request.isFavorite ?? request.is_favorite ?? false,
    );
    const command = new ToggleFavoriteCommand(
      request.id,
      request.userId || request.user_id,
      tenantId,
      isFavorite,
    );

    const template = await this.commandBus.execute<ToggleFavoriteCommand, Template>(command);

    return {
      success: true,
      message: 'Template favorite status updated',
      template: TemplateGrpcMapper.toDto(template),
    };
  }
}
