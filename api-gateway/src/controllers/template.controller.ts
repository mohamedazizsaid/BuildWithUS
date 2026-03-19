import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, Inject, OnModuleInit, UseGuards } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AuthGuard } from '../guards/auth.guard';

@Controller('templates')
@UseGuards(AuthGuard)
export class TemplateController implements OnModuleInit {
  private commandService: any;
  private queryService: any;

  constructor(
    @Inject('TEMPLATE_COMMAND_SERVICE') private readonly commandClient: ClientGrpc,
    @Inject('TEMPLATE_QUERY_SERVICE') private readonly queryClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.commandService = this.commandClient.getService('TemplateCommandService');
    this.queryService = this.queryClient.getService('TemplateQueryService');
  }

  @Post()
  async create(@Req() req: any, @Body() body: any) {
    const result = await firstValueFrom(this.commandService.CreateTemplate({
      user_id: req.user.id,
      tenant_id: req.user.tenant_id,
      name: body.name,
      description: body.description,
      type: body.type,
      subject: body.subject,
      content: body.content,
      channel_contents: body.channelContents || [],
      channels: body.channels || [],
    }));
    return result;
  }

  @Get()
  async list(@Req() req: any, @Query() query: any) {
    const result = await firstValueFrom(this.queryService.ListTemplates({
      user_id: req.user.id,
      tenant_id: req.user.tenant_id,
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 10,
      type: query.type || '',
      search: query.search || '',
      sort_by: query.sortBy || '',
      ascending: query.ascending === 'true',
    }));
    return result;
  }

  @Get(':id')
  async get(@Req() req: any, @Param('id') id: string) {
    const result = await firstValueFrom(this.queryService.GetTemplate({
      id,
      user_id: req.user.id,
      tenant_id: req.user.tenant_id,
    }));
    return result;
  }

  @Put(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const result = await firstValueFrom(this.commandService.UpdateTemplate({
      id,
      user_id: req.user.id,
      tenant_id: req.user.tenant_id,
      name: body.name,
      description: body.description,
      subject: body.subject,
      content: body.content,
      channel_contents: body.channelContents || [],
      channels: body.channels || [],
    }));
    return result;
  }

  @Delete(':id')
  async delete(@Req() req: any, @Param('id') id: string) {
    const result = await firstValueFrom(this.commandService.DeleteTemplate({
      id,
      user_id: req.user.id,
      tenant_id: req.user.tenant_id,
    }));
    return result;
  }

  @Post(':id/duplicate')
  async duplicate(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const result = await firstValueFrom(this.commandService.DuplicateTemplate({
      id,
      user_id: req.user.id,
      tenant_id: req.user.tenant_id,
      name: body.name,
    }));
    return result;
  }

  @Post(':id/render')
  async render(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const result = await firstValueFrom(this.queryService.RenderTemplate({
      id,
      user_id: req.user.id,
      variables: body.variables || {},
    }));
    return result;
  }
}
