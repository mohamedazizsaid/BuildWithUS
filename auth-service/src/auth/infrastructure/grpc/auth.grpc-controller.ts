import { Controller, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { GrpcMethod } from '@nestjs/microservices';
import { RegisterCommand } from '../../application/commands/register.command';
import { LoginCommand } from 'src/auth/application/commands/login.comand';
import { InviteUserCommand } from '../../application/commands/invite-user.command';
import { AcceptInviteCommand } from '../../application/commands/accept-invite.command';
import { JwtService } from '../../application/services/jwt.service';
import { UserRepository } from '../../domain/repositories/user.repository';
import { TenantRepository } from '../../domain/repositories/tenant.repository';

@Controller()
export class AuthGrpcController {
  private readonly logger = new Logger(AuthGrpcController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
    private readonly tenantRepository: TenantRepository,
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
      const payload = this.jwtService.verify(request.token);
      return {
        valid: true,
        user: {
          id: payload.userId,
          tenant_id: payload.tenantId,
          email: payload.email,
          role: payload.role,
        },
      };
    } catch {
      return { valid: false, user: null };
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
    } catch (error) {
      throw new Error(`Invalid token: ${error.message}`);
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
}
