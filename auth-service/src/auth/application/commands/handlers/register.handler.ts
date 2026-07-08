import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { RegisterCommand } from '../register.command';
import { TenantRepository } from '../../../domain/repositories/tenant.repository';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { Tenant } from '../../../domain/entities/tenant.aggregate';
import { PasswordService } from '../../services/password.service';
import { JwtService } from '../../services/jwt.service';

@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<RegisterCommand> {
  private readonly logger = new Logger(RegisterHandler.name);

  constructor(
    @Inject('TENANT_REPOSITORY')
    private readonly tenantRepository: TenantRepository,
    @Inject('USER_REPOSITORY')
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  async execute(command: RegisterCommand) {
    this.logger.debug(`Registering user: ${command.email}`);

    // Check if email already exists
    const existingUser = await this.userRepository.findByEmail(command.email);
    if (existingUser) {
      throw new Error('Cet e-mail est déjà utilisé par un autre compte.');
    }

    // Always create a BRAND-NEW tenant for a registration. We must NOT reuse an
    // existing tenant that happens to share the same name: registration always
    // makes the user an admin, so reusing a tenant would silently drop the new
    // account into someone else's organization as a second admin (a cross-tenant
    // breach). Joining an existing organization is invite-only (see AcceptInvite).
    //
    // Tenant names carry a UNIQUE constraint, so a clashing name must be rejected
    // with a clear message rather than blindly inserting (raw DB error) or — far
    // worse — reusing the existing org.
    const existingTenant = await this.tenantRepository.findByName(command.tenantName);
    if (existingTenant) {
      throw new Error(
        'Une organisation portant ce nom existe déjà. Veuillez en choisir un autre.',
      );
    }

    const tenant = Tenant.create(command.tenantName);
    await this.tenantRepository.save(tenant);
    this.logger.log(`Tenant created: ${tenant.getId()}`);

    // Hash password and create user
    const hashedPassword = await this.passwordService.hash(command.password);
    const { User } = await import('../../../domain/entities/user.aggregate');
    const user = User.create(
      tenant.getId(),
      command.email,
      hashedPassword,
      command.firstName,
      command.lastName,
      'admin', // first user in a tenant is admin
    );

    await this.userRepository.save(user);
    this.logger.log(`User registered: ${user.getId()}`);

    // Return JWT
    const token = this.jwtService.sign({
      userId: user.getId(),
      tenantId: tenant.getId(),
      email: user.getEmail(),
      role: user.getRole(),
    });

    return {
      token,
      user: {
        id: user.getId(),
        tenant_id: tenant.getId(),
        email: user.getEmail(),
        first_name: user.getFirstName(),
        last_name: user.getLastName(),
        role: user.getRole(),
      },
    };
  }
}
