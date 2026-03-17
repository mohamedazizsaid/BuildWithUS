import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { LoginCommand } from '../login.comand';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { PasswordService } from '../../services/password.service';
import { JwtService } from '../../services/jwt.service';

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  private readonly logger = new Logger(LoginHandler.name);

  constructor(
    @Inject('USER_REPOSITORY')
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  async execute(command: LoginCommand) {
    this.logger.debug(`Login attempt: ${command.email}`);

    // Find user by email
    const user = await this.userRepository.findByEmail(command.email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValid = await this.passwordService.compare(command.password, user.getPassword());
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    this.logger.log(`User logged in: ${user.getId()}`);

    // Return JWT
    const token = this.jwtService.sign({
      userId: user.getId(),
      tenantId: user.getTenantId(),
      email: user.getEmail(),
      role: user.getRole(),
    });

    return {
      token,
      user: {
        id: user.getId(),
        tenantId: user.getTenantId(),
        email: user.getEmail(),
        firstName: user.getFirstName(),
        lastName: user.getLastName(),
        role: user.getRole(),
      },
    };
  }
}
