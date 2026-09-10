import {
  Controller,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
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
import { TemplateHttpMapper } from './template.http-mapper.js';

/**
 * Template Commands HTTP/REST Controller
 *
 * Handles write operations for templates via HTTP REST.
 */
@Controller('templates')
export class TemplatesCommandsHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  /**
   * POST /templates — Create a new template
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(@Body() body: any) {
    const tenantId = body.tenantId || body.tenant_id || body.tenantid || '';
    if (!tenantId) {
      throw new BadRequestException('tenant_id is required');
    }

    const command = new CreateTemplateCommand(
      body.userId || body.user_id,
      tenantId,
      body.name,
      body.description,
      body.type,
      body.subject,
      body.content,
      body.channelContents || body.channel_contents || [],
      body.channels || [],
      body.isPredefinedOverride || body.is_predefined_override || false,
      body.predefinedTemplateId || body.predefined_template_id || '',
      body.externalOrgRef || body.external_org_ref || null,
    );

    const template = await this.commandBus.execute<CreateTemplateCommand, Template>(command);

    return {
      success: true,
      message: 'Template created successfully',
      template: TemplateHttpMapper.toDto(template),
    };
  }

  /**
   * PUT /templates/settings/custom-variables — Update tenant custom variables
   */
  @Put('settings/custom-variables')
  @HttpCode(HttpStatus.OK)
  async updateTenantVariables(@Body() body: any) {
    const tenantId = body.tenantId || body.tenant_id || '';
    const json = body.customVariablesJson || body.custom_variables_json || (typeof body.customVariables === 'object' ? JSON.stringify(body.customVariables) : '{}');
    const customVariables = typeof json === 'string' ? JSON.parse(json) : json;
    const command = new UpdateTenantVariablesCommand(tenantId, customVariables);
    return this.commandBus.execute(command);
  }

  /**
   * POST /templates/settings/custom-variables — Add a single tenant custom variable
   */
  @Post('settings/custom-variables')
  @HttpCode(HttpStatus.OK)
  async addTenantVariable(@Body() body: any) {
    const tenantId = body.tenantId || body.tenant_id || '';
    const category = body.category || '';
    const name = body.name || '';
    const command = new AddTenantVariableCommand(tenantId, category, name);
    return this.commandBus.execute(command);
  }

  /**
   * DELETE /templates/settings/custom-variables/:name — Delete a single tenant custom variable
   */
  @Delete('settings/custom-variables/:name')
  @HttpCode(HttpStatus.OK)
  async deleteTenantVariable(
    @Param('name') name: string,
    @Query('tenant_id') queryTenantId?: string,
    @Body('tenant_id') bodyTenantId?: string,
  ) {
    const tenantId = queryTenantId || bodyTenantId || '';
    const command = new DeleteTenantVariableCommand(tenantId, name);
    return this.commandBus.execute(command);
  }

  /**
   * PUT /templates/:id — Update an existing template
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updateTemplate(@Param('id') id: string, @Body() body: any) {
    const command = new UpdateTemplateCommand(
      id,
      body.userId || body.user_id,
      body.tenantId || body.tenant_id || '',
      body.name,
      body.description,
      body.subject,
      body.content,
      body.channelContents || body.channel_contents || [],
      body.channels || [],
    );

    const template = await this.commandBus.execute<UpdateTemplateCommand, Template>(command);

    return {
      success: true,
      message: 'Template updated successfully',
      template: TemplateHttpMapper.toDto(template),
    };
  }

  /**
   * DELETE /templates/:id — Delete a template (soft delete)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteTemplate(
    @Param('id') id: string,
    @Query('user_id') queryUserId?: string,
    @Query('tenant_id') queryTenantId?: string,
    @Body('user_id') bodyUserId?: string,
    @Body('tenant_id') bodyTenantId?: string,
  ) {
    const userId = queryUserId || bodyUserId || '';
    const tenantId = queryTenantId || bodyTenantId || '';
    const command = new DeleteTemplateCommand(id, userId, tenantId);

    await this.commandBus.execute<DeleteTemplateCommand, void>(command);

    return {
      success: true,
      message: 'Template deleted successfully',
    };
  }

  /**
   * POST /templates/:id/duplicate — Duplicate a template
   */
  @Post(':id/duplicate')
  @HttpCode(HttpStatus.OK)
  async duplicateTemplate(@Param('id') id: string, @Body() body: any) {
    const tenantId = body.tenantId || body.tenant_id || '';
    const command = new DuplicateTemplateCommand(
      id,
      body.userId || body.user_id,
      tenantId,
      body.name,
    );

    const template = await this.commandBus.execute<DuplicateTemplateCommand, Template>(command);

    return {
      success: true,
      message: 'Template duplicated successfully',
      template: TemplateHttpMapper.toDto(template),
    };
  }

  /**
   * PUT /templates/:id/favorite — Toggle favorite status
   */
  @Put(':id/favorite')
  @HttpCode(HttpStatus.OK)
  async toggleFavorite(@Param('id') id: string, @Body() body: any) {
    const tenantId = body.tenantId || body.tenant_id || '';
    const isFavorite = Boolean(
      body.isFavorite ?? body.is_favorite ?? false,
    );
    const command = new ToggleFavoriteCommand(
      id,
      body.userId || body.user_id,
      tenantId,
      isFavorite,
    );

    const template = await this.commandBus.execute<ToggleFavoriteCommand, Template>(command);

    return {
      success: true,
      message: 'Template favorite status updated',
      template: TemplateHttpMapper.toDto(template),
    };
  }
}
