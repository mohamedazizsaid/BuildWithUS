import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Inject,
  HttpCode,
  HttpStatus,
  Logger,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Request } from 'express';
import { RegisterCommand } from '../../application/commands/register.command';
import { LoginCommand } from '../../application/commands/login.comand';
import { InviteUserCommand } from '../../application/commands/invite-user.command';
import { AcceptInviteCommand } from '../../application/commands/accept-invite.command';
import { RequestPasswordResetCommand } from '../../application/commands/request-password-reset.command';
import { ResetPasswordCommand } from '../../application/commands/reset-password.command';
import { GenerateApiClientCommand } from '../../application/commands/generate-api-client.command';
import { IssueClientTokenCommand } from '../../application/commands/issue-client-token.command';
import { RegisterApiClientCommand } from '../../application/commands/register-api-client.command';
import { UpdateAllowedReturnUrlsCommand } from '../../application/commands/update-allowed-return-urls.command';
import { SetTenantReturnUrlsCommand } from '../../application/commands/set-tenant-return-urls.command';
import { MintBuilderSessionCommand } from '../../application/commands/mint-builder-session.command';
import { ExchangeBuilderSessionCommand } from '../../application/commands/exchange-builder-session.command';
import { BuilderSessionMode } from '../../domain/repositories/builder-session.repository';
import { JwtService } from '../../application/services/jwt.service';
import { PasswordService } from '../../application/services/password.service';
import { UserRepository } from '../../domain/repositories/user.repository';
import { TenantRepository } from '../../domain/repositories/tenant.repository';
import { ApiClientRepository } from '../../domain/repositories/api-client.repository';
import { UserRole } from '../../domain/entities/user.aggregate';

const ASSIGNABLE_ROLES = ['admin', 'editor', 'viewer', 'marketing'];

@Controller()
export class AuthHttpController {
  private readonly logger = new Logger(AuthHttpController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
    private readonly userRepository: UserRepository,
    private readonly tenantRepository: TenantRepository,
    @Inject('API_CLIENT_REPOSITORY')
    private readonly apiClientRepository: ApiClientRepository,
  ) {}

  private toUserInfo(user: any) {
    return {
      id: user.getId(),
      tenant_id: user.getTenantId(),
      email: user.getEmail(),
      first_name: user.getFirstName(),
      last_name: user.getLastName(),
      role: user.getRole(),
      first_log: user.getFirstLog?.() ?? false,
    };
  }

  private toTenantInfo(tenant: any) {
    const p = tenant.toPrimitives();
    return {
      id: p.id,
      name: p.name,
      plan: p.plan,
      created_at: p.createdAt?.toISOString?.() ?? '',
      billing_cycle: p.billingCycle ?? '',
      subscription_status: p.subscriptionStatus ?? '',
      stripe_customer_id: p.stripeCustomerId ?? '',
      stripe_subscription_id: p.stripeSubscriptionId ?? '',
      email_templates_created: p.emailTemplatesCreated ?? 0,
      ai_interactions_used: p.aiInteractionsUsed ?? 0,
      phone: p.phone ?? '',
      address_line: p.addressLine ?? '',
      postal_code: p.postalCode ?? '',
      city: p.city ?? '',
      country: p.country ?? '',
    };
  }

  private toTenantUsage(tenant: any) {
    const p = tenant.toPrimitives();
    return {
      tenant_id: p.id,
      plan: p.plan,
      email_templates_created: p.emailTemplatesCreated ?? 0,
      ai_interactions_used: p.aiInteractionsUsed ?? 0,
    };
  }

  // ── Health ────────────────────────────────────────────────────────────────

  @Get('health')
  health() {
    return { status: 'ok', service: 'auth-service' };
  }

  // ── Authentication ────────────────────────────────────────────────────────

  @Post('auth/register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: any) {
    const tenantName = body.tenantName || body.tenant_name;
    const firstName = body.firstName || body.first_name;
    const lastName = body.lastName || body.last_name;

    const command = new RegisterCommand(
      tenantName,
      body.email,
      body.password,
      firstName,
      lastName,
      body.phone || null,
      body.addressLine || body.address_line || null,
      body.postalCode || body.postal_code || null,
      body.city || null,
      body.country || null,
    );
    return this.commandBus.execute(command);
  }

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any) {
    const command = new LoginCommand(body.email, body.password);
    return this.commandBus.execute(command);
  }

  @Get('auth/validate-token')
  async validateToken(@Req() req: Request) {
    const token =
      req.headers.authorization?.replace('Bearer ', '') ||
      (req as any).cookies?.token ||
      '';

    if (!token) {
      return { valid: false, token_type: '', user: null, organisation_id: '', scopes: [] };
    }

    try {
      try {
        const sess = this.jwtService.verifyIntegrationSession(token);
        return {
          valid: true,
          token_type: 'integration_session',
          user: {
            id: 'integration-session',
            tenant_id: sess.tenant_id,
            email: '',
            role: 'editor',
          },
          organisation_id: '',
          scopes: sess.scopes ?? [],
          user_ref: sess.user_ref ?? '',
        };
      } catch {}

      try {
        const m2m = this.jwtService.verifyM2M(token) as any;
        return {
          valid: true,
          token_type: 'm2m',
          user: { id: m2m.user_id || m2m.userId || '', tenant_id: m2m.sub, email: '', role: '' },
          organisation_id: m2m.organisation_id || m2m.organisationId || '',
          scopes: m2m.scopes,
        };
      } catch {}

      const payload = this.jwtService.verify(token);
      return {
        valid: true,
        token_type: 'user',
        user: {
          id: payload.userId,
          tenant_id: payload.tenantId,
          email: payload.email,
          role: payload.role,
        },
        organisation_id: '',
        scopes: [],
      };
    } catch {
      return { valid: false, token_type: '', user: null, organisation_id: '', scopes: [] };
    }
  }

  @Get('auth/me')
  async getMe(@Req() req: Request, @Query('token') qToken?: string, @Query('user_id') qUserId?: string) {
    const token =
      qToken ||
      req.headers.authorization?.replace('Bearer ', '') ||
      (req as any).cookies?.token;

    let userId = qUserId;
    if (token) {
      try {
        const payload = this.jwtService.verify(token);
        userId = payload.userId;
      } catch (err: any) {
        throw new UnauthorizedException(`Invalid token: ${err?.message}`);
      }
    }

    if (!userId) throw new BadRequestException('Token or user_id required');
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const tenant = await this.tenantRepository.findById(user.getTenantId());
    return {
      user: this.toUserInfo(user),
      tenant_name: tenant?.getName() || '',
    };
  }

  @Put('auth/profile')
  async updateProfile(@Req() req: Request, @Body() body: any) {
    const token =
      body.token ||
      req.headers.authorization?.replace('Bearer ', '') ||
      (req as any).cookies?.token;

    let userId = body.userId || body.user_id;
    if (token) {
      try {
        const payload = this.jwtService.verify(token);
        userId = payload.userId;
      } catch (err: any) {
        throw new UnauthorizedException(`Invalid token: ${err?.message}`);
      }
    }

    if (!userId) throw new BadRequestException('User identification required');
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const firstName = body.firstName || body.first_name;
    const lastName = body.lastName || body.last_name;
    user.updateProfile(firstName, lastName);
    await this.userRepository.save(user);

    return { user: this.toUserInfo(user) };
  }

  @Put('auth/first-log')
  async markFirstLog(@Req() req: Request, @Body() body: any) {
    const token =
      body?.token ||
      req.headers.authorization?.replace('Bearer ', '') ||
      (req as any).cookies?.token;

    let userId = body?.userId || body?.user_id;
    if (token) {
      try {
        const payload = this.jwtService.verify(token);
        userId = payload.userId;
      } catch (err: any) {
        throw new UnauthorizedException(`Invalid token: ${err?.message}`);
      }
    }

    if (!userId) throw new BadRequestException('User identification required');
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    user.markFirstLog();
    await this.userRepository.save(user);
    return { user: this.toUserInfo(user) };
  }

  @Post('auth/invite')
  @HttpCode(HttpStatus.OK)
  async inviteUser(@Body() body: any) {
    const tenantId = body.tenantId || body.tenant_id;
    const invitedBy = body.invitedBy || body.invited_by;
    const command = new InviteUserCommand(
      tenantId,
      body.email,
      body.role || 'editor',
      invitedBy,
    );
    return this.commandBus.execute(command);
  }

  @Post('auth/accept-invite')
  @HttpCode(HttpStatus.OK)
  async acceptInvite(@Body() body: any) {
    const firstName = body.firstName || body.first_name;
    const lastName = body.lastName || body.last_name;
    const command = new AcceptInviteCommand(
      body.token,
      body.password,
      firstName,
      lastName,
    );
    return this.commandBus.execute(command);
  }

  @Post('auth/forgot-password')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() body: any) {
    const command = new RequestPasswordResetCommand(body.email);
    return this.commandBus.execute(command);
  }

  @Post('auth/reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: any) {
    const password = body.new_password || body.newPassword || body.password;
    const command = new ResetPasswordCommand(body.token, password);
    return this.commandBus.execute(command);
  }

  @Get('auth/members')
  async listMembers(@Req() req: Request, @Query('tenant_id') qTenantId?: string, @Query('token') qToken?: string) {
    let tenantId = qTenantId;
    const token =
      qToken ||
      req.headers.authorization?.replace('Bearer ', '') ||
      (req as any).cookies?.token;

    if (token) {
      try {
        const payload = this.jwtService.verify(token);
        tenantId = payload.tenantId;
      } catch (err: any) {
        throw new UnauthorizedException(`Invalid token: ${err?.message}`);
      }
    }

    if (!tenantId) throw new BadRequestException('tenant_id is required');
    const members = await this.userRepository.findByTenantId(tenantId);
    return {
      members: members.map((m) => ({
        id: m.getId(),
        tenant_id: m.getTenantId(),
        email: m.getEmail(),
        first_name: m.getFirstName(),
        last_name: m.getLastName(),
        role: m.getRole(),
      })),
    };
  }

  // ── Tenant Usage ──────────────────────────────────────────────────────────

  @Get(['auth/tenants/:id/usage', 'auth/admin/tenants/:id/usage'])
  async getTenantUsage(@Param('id') tenantId: string) {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) throw new NotFoundException('Tenant not found');
    return this.toTenantUsage(tenant);
  }

  @Post(['auth/tenants/:id/usage/increment', 'auth/admin/tenants/:id/usage/increment'])
  @HttpCode(HttpStatus.OK)
  async incrementTenantUsage(@Param('id') tenantId: string, @Body() body: any) {
    const kind = body.kind || '';
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (kind === 'email_template') tenant.incrementEmailTemplatesCreated();
    else if (kind === 'ai_interaction') tenant.incrementAiInteractionsUsed();
    else throw new BadRequestException(`Unknown usage kind: ${kind}`);
    await this.tenantRepository.save(tenant);
    return this.toTenantUsage(tenant);
  }

  // ── Tenant Billing & Admin ────────────────────────────────────────────────

  @Get('auth/admin/tenants/:id/billing')
  async getTenantBilling(@Param('id') tenantId: string) {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) throw new NotFoundException('Tenant not found');
    return this.toTenantInfo(tenant);
  }

  @Get('auth/admin/tenants/:id/admin-user')
  async getTenantAdmin(@Param('id') tenantId: string) {
    const members = await this.userRepository.findByTenantId(tenantId);
    if (!members.length) throw new NotFoundException('Tenant has no users');
    const admin = members.find((m) => m.getRole() === 'admin') ?? members[0];
    return this.toUserInfo(admin);
  }

  @Patch('auth/admin/tenants/:id/plan')
  @HttpCode(HttpStatus.OK)
  async updateTenantPlan(@Param('id') tenantId: string, @Body() body: any) {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) throw new NotFoundException('Tenant not found');
    tenant.updateSubscription({
      plan: body.plan,
      billingCycle: body.billingCycle ?? body.billing_cycle ?? null,
      subscriptionStatus: body.subscriptionStatus ?? body.subscription_status ?? null,
      stripeCustomerId: body.stripeCustomerId ?? body.stripe_customer_id ?? null,
      stripeSubscriptionId: body.stripeSubscriptionId ?? body.stripe_subscription_id ?? null,
    });
    await this.tenantRepository.save(tenant);
    return this.toTenantInfo(tenant);
  }

  @Post('auth/admin/tenants/:id/plan')
  @HttpCode(HttpStatus.OK)
  async adminSetTenantPlan(@Param('id') tenantId: string, @Body() body: any) {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) throw new NotFoundException('Tenant not found');
    tenant.updatePlan(body.plan);
    await this.tenantRepository.save(tenant);
    return this.toTenantInfo(tenant);
  }

  // ── Super Admin ───────────────────────────────────────────────────────────

  @Get('auth/admin/tenants')
  async listAllTenants() {
    const tenants = await this.tenantRepository.findAll();
    return { tenants: tenants.map((t) => this.toTenantInfo(t)) };
  }

  @Get('auth/admin/users')
  async listAllUsers() {
    const users = await this.userRepository.findAll();
    return { users: users.map((u) => this.toUserInfo(u)) };
  }

  @Patch('auth/admin/users/:id/role')
  @HttpCode(HttpStatus.OK)
  async adminUpdateUserRole(@Param('id') userId: string, @Body() body: any) {
    const role = body.role;
    if (!ASSIGNABLE_ROLES.includes(role)) {
      throw new BadRequestException(`Invalid role. Allowed: ${ASSIGNABLE_ROLES.join(', ')}`);
    }
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    if ((user.getRole() as string) === 'super_admin') {
      throw new BadRequestException('Cannot change the role of a super_admin');
    }
    user.updateRole(role as UserRole);
    await this.userRepository.save(user);
    return { success: true, user: this.toUserInfo(user) };
  }

  @Post('auth/admin/users/:id/reset-password')
  @HttpCode(HttpStatus.OK)
  async adminResetPassword(@Param('id') userId: string, @Body() body: any) {
    const newPassword = body.newPassword || body.new_password || body.password;
    if (!newPassword || newPassword.length < 4) {
      throw new BadRequestException('Password must be at least 4 characters');
    }
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const hashed = await this.passwordService.hash(newPassword);
    user.changePassword(hashed);
    await this.userRepository.save(user);
    return { success: true, user: this.toUserInfo(user) };
  }

  @Delete('auth/admin/users/:id')
  @HttpCode(HttpStatus.OK)
  async adminDeleteUser(@Param('id') userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    if ((user.getRole() as string) === 'super_admin') {
      throw new BadRequestException('Cannot delete a super_admin');
    }
    await this.userRepository.delete(userId);
    return { success: true };
  }

  // ── Api Clients & OAuth & Builder Sessions ────────────────────────────────

  @Get(['integrations/api-keys', 'auth/admin/tenants/:id/api-clients'])
  async listApiClients(@Param('id') paramTenantId?: string, @Req() req?: Request) {
    const tenantId = paramTenantId || (req as any)?.user?.tenant_id || req?.headers?.['x-tenant-id'] || '';
    if (!tenantId) throw new BadRequestException('tenant_id required');
    const clients = await this.apiClientRepository.findByTenantId(tenantId as string);
    return {
      clients: clients.map((c) => ({
        id: c.id,
        tenant_id: c.tenantId,
        client_id: c.clientId,
        scopes: c.scopes,
        created_at: c.createdAt?.toISOString?.() ?? '',
        label: c.label ?? '',
        allowed_return_urls: (c.allowedReturnUrls ?? '')
          .split(',')
          .map((u) => u.trim())
          .filter(Boolean),
      })),
    };
  }

  @Post(['integrations/api-keys', 'auth/admin/tenants/:id/api-clients'])
  @HttpCode(HttpStatus.CREATED)
  async generateApiClient(@Param('id') paramTenantId: string, @Body() body: any) {
    const tenantId = paramTenantId || body.tenantId || body.tenant_id;
    const command = new GenerateApiClientCommand(
      tenantId,
      body.scopes || 'templates:read templates:write',
      body.label ? (body.label as string).trim() : null,
    );
    return this.commandBus.execute(command);
  }

  @Delete(['integrations/api-keys/:id', 'auth/admin/api-clients/:id'])
  @HttpCode(HttpStatus.OK)
  async revokeApiClient(@Param('id') id: string) {
    await this.apiClientRepository.deleteById(id);
    return { success: true };
  }

  @Put('integrations/return-urls')
  @HttpCode(HttpStatus.OK)
  async setTenantReturnUrls(@Body() body: any) {
    const tenantId = body.tenantId || body.tenant_id;
    const clientId = body.clientId || body.client_id;
    if (!clientId) throw new BadRequestException('client_id is required');
    const urls: string[] = Array.isArray(body.urls) ? body.urls : [];
    const command = new SetTenantReturnUrlsCommand(tenantId, clientId, urls);
    return this.commandBus.execute(command);
  }

  @Post('oauth/token')
  @HttpCode(HttpStatus.OK)
  async issueClientToken(@Body() body: any) {
    const clientId = body.clientId || body.client_id;
    const clientSecret = body.clientSecret || body.client_secret;
    const userId = body.userId || body.user_id || '';
    const organisationId =
      body?.custom_champ?.external_org_ref ||
      body?.external_org_ref ||
      body?.organisation_id ||
      '';
    if (!organisationId) {
      throw new BadRequestException(
        'custom_champ.external_org_ref is required to scope the token to an organization',
      );
    }
    const command = new IssueClientTokenCommand(clientId, clientSecret, userId, organisationId);
    return this.commandBus.execute(command);
  }

  @Post('oauth/register')
  @HttpCode(HttpStatus.CREATED)
  async registerApiClient(@Body() body: any) {
    const appName = body.appName || body.app_name;
    const contactEmail = body.contactEmail || body.contact_email || '';
    const command = new RegisterApiClientCommand(appName, contactEmail, body.scopes || '');
    return this.commandBus.execute(command);
  }

  @Post('developers/return-urls')
  @HttpCode(HttpStatus.OK)
  async updateReturnUrls(@Body() body: any) {
    const clientId = body.clientId || body.client_id;
    const clientSecret = body.clientSecret || body.client_secret;
    const urls: string[] = Array.isArray(body.urls) ? body.urls : [];
    const command = new UpdateAllowedReturnUrlsCommand(clientId, clientSecret, urls);
    return this.commandBus.execute(command);
  }

  @Post('api/builder-sessions')
  @HttpCode(HttpStatus.CREATED)
  async mintBuilderSession(@Body() body: any) {
    const externalOrgRef =
      body?.custom_champ?.external_org_ref || body?.external_org_ref;
    if (!externalOrgRef) {
      throw new BadRequestException(
        'custom_champ.external_org_ref is required to scope the session to an organization',
      );
    }
    const clientId = body.clientId || body.client_id;
    const clientSecret = body.clientSecret || body.client_secret;
    const mode = (body.mode || 'new') as BuilderSessionMode;
    const returnUrl = body.returnUrl || body.return_url;
    const templateId = body.templateId || body.template_id || null;
    const command = new MintBuilderSessionCommand(
      clientId,
      clientSecret,
      mode,
      returnUrl,
      templateId || null,
      externalOrgRef,
    );
    return this.commandBus.execute(command);
  }

  @Post('s/exchange')
  @HttpCode(HttpStatus.OK)
  async exchangeBuilderSession(@Body() body: any) {
    const command = new ExchangeBuilderSessionCommand(body.token);
    return this.commandBus.execute(command);
  }
}
