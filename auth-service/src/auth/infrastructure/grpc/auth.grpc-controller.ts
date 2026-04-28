import { Controller, Inject, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { GrpcMethod } from '@nestjs/microservices';
import { RegisterCommand } from '../../application/commands/register.command';
import { LoginCommand } from '../../application/commands/login.comand';
import { InviteUserCommand } from '../../application/commands/invite-user.command';
import { AcceptInviteCommand } from '../../application/commands/accept-invite.command';
import { GenerateApiClientCommand } from '../../application/commands/generate-api-client.command';
import { IssueClientTokenCommand } from '../../application/commands/issue-client-token.command';
import { RegisterApiClientCommand } from '../../application/commands/register-api-client.command';
import { JwtService } from '../../application/services/jwt.service';
import { UserRepository } from '../../domain/repositories/user.repository';
import { TenantRepository } from '../../domain/repositories/tenant.repository';
import { ApiClientRepository } from '../../domain/repositories/api-client.repository';

@Controller()
export class AuthGrpcController {
  private readonly logger = new Logger(AuthGrpcController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
    private readonly tenantRepository: TenantRepository,
    @Inject('API_CLIENT_REPOSITORY')
    private readonly apiClientRepository: ApiClientRepository,
  ) {}

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
      // Try M2M token first (type: "m2m")
      try {
        const m2m = this.jwtService.verifyM2M(request.token);
        return {
          valid: true,
          token_type: 'm2m',
          user: { id: m2m.userId || '', tenant_id: m2m.sub, email: '', role: '' },
          organisation_id: m2m.organisationId || '',
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

  @GrpcMethod('AuthService', 'GenerateApiClient')
  async generateApiClient(request: any) {
    const tenantId = request.tenantId || request.tenant_id;
    const command = new GenerateApiClientCommand(tenantId, request.scopes || '');
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
      })),
    };
  }

  @GrpcMethod('AuthService', 'RevokeApiClient')
  async revokeApiClient(request: any) {
    await this.apiClientRepository.deleteById(request.id);
    return { success: true };
  }
}
