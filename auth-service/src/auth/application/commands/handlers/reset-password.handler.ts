import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { ResetPasswordCommand } from '../reset-password.command';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { PasswordService } from '../../services/password.service';
import { JwtService } from '../../services/jwt.service';

@CommandHandler(ResetPasswordCommand)
export class ResetPasswordHandler implements ICommandHandler<ResetPasswordCommand> {
  private readonly logger = new Logger(ResetPasswordHandler.name);

  constructor(
    @Inject('USER_REPOSITORY')
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  async execute(command: ResetPasswordCommand) {
    this.logger.debug('Resetting password via token');

    // Verify the reset token (throws if expired or invalid)
    let payload;
    try {
      payload = this.jwtService.verifyPasswordReset(command.token);
    } catch {
      throw new Error('Invalid or expired reset link');
    }

    const user = await this.userRepository.findById(payload.userId);
    if (!user) {
      throw new Error('User not found');
    }

    const hashedPassword = await this.passwordService.hash(command.password);
    user.changePassword(hashedPassword);
    await this.userRepository.save(user);

    this.logger.log(`Password reset for user: ${user.getId()}`);

    return { success: true, email: user.getEmail() };
  }
}
