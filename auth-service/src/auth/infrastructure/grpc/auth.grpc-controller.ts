import { Controller, Inject, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { GrpcMethod } from '@nestjs/microservices';
import { RegisterCommand } from '../../application/commands/register.command';
import { LoginCommand } from '../../application/commands/login.comand';
import { InviteUserCommand } from '../../application/commands/invite-user.command';
import { AcceptInviteCommand } from '../../application/commands/accept-invite.command';
import { RequestPasswordResetCommand } from '../../application/commands/request-password-reset.command';
import { ResetPasswordCommand } from '../../application/commands/reset-password.command';
import { GenerateApiClientCommand } from '../../application/commands/generate-api-client.command';
import { IssueClientTokenCommand } from '../../application/commands/issue-client-token.command';
import { RegisterApiClientCommand } from '../../application/commands/register-api-client.command';
import { RegisterDeveloperCommand } from '../../application/commands/register-developer.command';
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

// Roles a super-admin is allowed to assign through the admin panel. Note we do
// NOT allow promoting to 'super_admin' here — that stays a deliberate DB action.
const ASSIGNABLE_ROLES = ['admin', 'editor', 'viewer', 'marketing'];

@Controller()
export class AuthGrpcController {
  private readonly logger = new Logger(AuthGrpcController.name);

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
    };
  }

  @GrpcMethod('AuthService', 'Register')
  async register(request: any) {
    this.logger.debug(`Register request: ${JSON.stringify(request)}`);

    const tenantName = request.tenantName || request.tenant_name;
    const firstName = request.firstName || request.first_name;
    const lastName = request.lastName || request.last_name;

    const command = new RegisterCommand(
      tenantName,
      request.email,
      request.password,
      firstName,
      lastName,
    );

    return this.commandBus.execute(command);
  }

  @GrpcMethod('AuthService', 'Login')
  async login(request: { email: string; password: string }) {
    const command = new LoginCommand(request.email, request.password);
    return this.commandBus.execute(command);
  }

  @GrpcMethod('AuthService', 'ValidateToken')
  async validateToken(request: { token: string }) {
    try {
      // Try integration_session token first
      try {
        const sess = this.jwtService.verifyIntegrationSession(request.token);
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
          // The org id the integrating tool sent at mint time (carried as user_ref);
          // the gateway surfaces this as req.user.external_org_ref to scope templates.
          user_ref: sess.user_ref ?? '',
        };
      } catch {
        // Not an integration_session — keep trying
      }

      // Try M2M token (type: "m2m")
      try {
        const m2m = this.jwtService.verifyM2M(request.token) as any;
        return {
          valid: true,
          token_type: 'm2m',
          // signM2M stores claims as snake_case (user_id / organisation_id).
          user: { id: m2m.user_id || m2m.userId || '', tenant_id: m2m.sub, email: '', role: '' },
          organisation_id: m2m.organisation_id || m2m.organisationId || '',
          scopes: m2m.scopes,
        };
      } catch {
        // Not a M2M token — fall through to user token verification
      }

      const payload = this.jwtService.verify(request.token);
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

  @GrpcMethod('AuthService', 'InviteUser')
  async inviteUser(request: any) {
    const tenantId = request.tenantId || request.tenant_id;
    const invitedBy = request.invitedBy || request.invited_by;

    const command = new InviteUserCommand(
      tenantId,
      request.email,
      request.role || 'editor',
      invitedBy,
    );

    return this.commandBus.execute(command);
  }

  @GrpcMethod('AuthService', 'GetMe')
  async getMe(request: { token: string }) {
    try {
      const payload = this.jwtService.verify(request.token);
      const user = await this.userRepository.findById(payload.userId);
      if (!user) {
        throw new Error('User not found');
      }

      const tenant = await this.tenantRepository.findById(user.getTenantId());
      return {
        user: {
          id: user.getId(),
          tenant_id: user.getTenantId(),
          email: user.getEmail(),
          first_name: user.getFirstName(),
          last_name: user.getLastName(),
          role: user.getRole(),
        },
        tenant_name: tenant?.getName() || '',
      };
    } catch (error: any) {
      throw new Error(`Invalid token: ${error?.message ?? error}`);
    }
  }

  @GrpcMethod('AuthService', 'ListMembers')
  async listMembers(request: { token: string }) {
    const payload = this.jwtService.verify(request.token);
    const user = await this.userRepository.findById(payload.userId);
    if (!user || user.getRole() !== 'admin') {
      throw new Error('Only admins can list members');
    }

    const members = await this.userRepository.findByTenantId(payload.tenantId);
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

  @GrpcMethod('AuthService', 'UpdateProfile')
  async updateProfile(request: any) {
    const payload = this.jwtService.verify(request.token);
    const user = await this.userRepository.findById(payload.userId);
    if (!user) {
      throw new Error('User not found');
    }

    const firstName = request.firstName || request.first_name;
    const lastName = request.lastName || request.last_name;
    user.updateProfile(firstName, lastName);
    await this.userRepository.save(user);

    return {
      user: {
        id: user.getId(),
        tenant_id: user.getTenantId(),
        email: user.getEmail(),
        first_name: user.getFirstName(),
        last_name: user.getLastName(),
        role: user.getRole(),
      },
    };
  }

  @GrpcMethod('AuthService', 'AcceptInvite')
  async acceptInvite(request: any) {
    const firstName = request.firstName || request.first_name;
    const lastName = request.lastName || request.last_name;

    const command = new AcceptInviteCommand(
      request.token,
      request.password,
      firstName,
      lastName,
    );

    return this.commandBus.execute(command);
  }

  @GrpcMethod('AuthService', 'RequestPasswordReset')
  async requestPasswordReset(request: any) {
    const command = new RequestPasswordResetCommand(request.email);
    return this.commandBus.execute(command);
  }

  @GrpcMethod('AuthService', 'ResetPassword')
  async resetPassword(request: any) {
    const command = new ResetPasswordCommand(request.token, request.password);
    return this.commandBus.execute(command);
  }

  @GrpcMethod('AuthService', 'GenerateApiClient')
  async generateApiClient(request: any) {
    const tenantId = request.tenantId || request.tenant_id;
    const command = new GenerateApiClientCommand(
      tenantId,
      request.scopes || '',
      request.label || null,
    );
    return this.commandBus.execute(command);
  }

  @GrpcMethod('AuthService', 'IssueClientToken')
  async issueClientToken(request: any) {
    const clientId = request.clientId || request.client_id;
    const clientSecret = request.clientSecret || request.client_secret;
    const userId = request.userId || request.user_id;
    const organisationId = request.organisationId || request.organisation_id;
    const command = new IssueClientTokenCommand(clientId, clientSecret, userId, organisationId);
    return this.commandBus.execute(command);
  }

  @GrpcMethod('AuthService', 'RegisterApiClient')
  async registerApiClient(request: any) {
    const appName = request.appName || request.app_name;
    const contactEmail = request.contactEmail || request.contact_email;
    const command = new RegisterApiClientCommand(appName, contactEmail, request.scopes || '');
    return this.commandBus.execute(command);
  }

  @GrpcMethod('AuthService', 'ListAllTenants')
  async listAllTenants() {
    const tenants = await this.tenantRepository.findAll();
    return {
      tenants: tenants.map((t) => {
        const p = t.toPrimitives();
        return {
          id: p.id,
          name: p.name,
          plan: p.plan,
          created_at: p.createdAt?.toISOString?.() ?? '',
        };
      }),
    };
  }

  @GrpcMethod('AuthService', 'ListApiClients')
  async listApiClients(request: any) {
    const tenantId = request.tenantId || request.tenant_id;
    const clients = await this.apiClientRepository.findByTenantId(tenantId);
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

  @GrpcMethod('AuthService', 'RevokeApiClient')
  async revokeApiClient(request: any) {
    await this.apiClientRepository.deleteById(request.id);
    return { success: true };
  }

  @GrpcMethod('AuthService', 'ListAllUsers')
  async listAllUsers() {
    const users = await this.userRepository.findAll();
    return { users: users.map((u) => this.toUserInfo(u)) };
  }

  @GrpcMethod('AuthService', 'AdminUpdateUserRole')
  async adminUpdateUserRole(request: any) {
    const userId = request.userId || request.user_id;
    const role = request.role;
    if (!ASSIGNABLE_ROLES.includes(role)) {
      throw new Error(
        `Invalid role. Allowed: ${ASSIGNABLE_ROLES.join(', ')}`,
      );
    }
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    // Guard: never demote a super_admin through this endpoint.
    if ((user.getRole() as string) === 'super_admin') {
      throw new Error('Cannot change the role of a super_admin');
    }
    user.updateRole(role as UserRole);
    await this.userRepository.save(user);
    return { success: true, user: this.toUserInfo(user) };
  }

  @GrpcMethod('AuthService', 'AdminResetPassword')
  async adminResetPassword(request: any) {
    const userId = request.userId || request.user_id;
    const newPassword = request.newPassword || request.new_password;
    if (!newPassword || newPassword.length < 4) {
      throw new Error('Password must be at least 4 characters');
    }
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    const hashed = await this.passwordService.hash(newPassword);
    user.changePassword(hashed);
    await this.userRepository.save(user);
    return { success: true, user: this.toUserInfo(user) };
  }

  @GrpcMethod('AuthService', 'AdminDeleteUser')
  async adminDeleteUser(request: any) {
    const userId = request.userId || request.user_id;
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    // Guard: never delete a super_admin through this endpoint.
    if ((user.getRole() as string) === 'super_admin') {
      throw new Error('Cannot delete a super_admin');
    }
    await this.userRepository.delete(userId);
    return { success: true };
  }

  @GrpcMethod('AuthService', 'RegisterDeveloper')
  async registerDeveloper(request: any) {
    const command = new RegisterDeveloperCommand(request.name, request.email);
    return this.commandBus.execute(command);
  }

  @GrpcMethod('AuthService', 'UpdateAllowedReturnUrls')
  async updateAllowedReturnUrls(request: any) {
    const clientId = request.clientId || request.client_id;
    const clientSecret = request.clientSecret || request.client_secret;
    const urls: string[] = Array.isArray(request.urls) ? request.urls : [];
    const command = new UpdateAllowedReturnUrlsCommand(clientId, clientSecret, urls);
    return this.commandBus.execute(command);
  }

  @GrpcMethod('AuthService', 'SetTenantReturnUrls')
  async setTenantReturnUrls(request: any) {
    const tenantId = request.tenantId || request.tenant_id;
    const clientId = request.clientId || request.client_id;
    const urls: string[] = Array.isArray(request.urls) ? request.urls : [];
    const command = new SetTenantReturnUrlsCommand(tenantId, clientId, urls);
    return this.commandBus.execute(command);
  }

  @GrpcMethod('AuthService', 'MintBuilderSession')
  async mintBuilderSession(request: any) {
    const clientId = request.clientId || request.client_id;
    const clientSecret = request.clientSecret || request.client_secret;
    const mode = (request.mode || 'new') as BuilderSessionMode;
    const returnUrl = request.returnUrl || request.return_url;
    const templateId = request.templateId || request.template_id || null;
    const userRef = request.userRef || request.user_ref || null;
    const command = new MintBuilderSessionCommand(
      clientId,
      clientSecret,
      mode,
      returnUrl,
      templateId || null,
      userRef || null,
    );
    return this.commandBus.execute(command);
  }

  @GrpcMethod('AuthService', 'ExchangeBuilderSession')
  async exchangeBuilderSession(request: any) {
    const command = new ExchangeBuilderSessionCommand(request.token);
    return this.commandBus.execute(command);
  }
}
