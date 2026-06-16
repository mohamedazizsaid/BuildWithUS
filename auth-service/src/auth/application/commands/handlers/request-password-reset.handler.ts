import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { RequestPasswordResetCommand } from '../request-password-reset.command';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { JwtService } from '../../services/jwt.service';

@CommandHandler(RequestPasswordResetCommand)
export class RequestPasswordResetHandler
  implements ICommandHandler<RequestPasswordResetCommand>
{
  private readonly logger = new Logger(RequestPasswordResetHandler.name);

  constructor(
    @Inject('USER_REPOSITORY')
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(command: RequestPasswordResetCommand) {
    const email = command.email.toLowerCase().trim();
    this.logger.debug(`Password reset requested for: ${email}`);

    const user = await this.userRepository.findByEmail(email);

    // Never reveal whether the account exists. When there's no user we simply
    // return email_exists=false and the gateway skips sending the email — the
    // caller still gets the same generic success response.
    if (!user) {
      this.logger.log(`No account for ${email} — skipping reset email`);
      return { email_exists: false, email: '', token: '', first_name: '' };
    }

    // Reset token (expires in 15 minutes, like invites)
    const token = this.jwtService.signPasswordReset({
      userId: user.getId(),
      email: user.getEmail(),
    });

    this.logger.log(`Password reset token issued for ${email} (expires in 15min)`);

    // The gateway builds the link: https://app.winaity.com/reset-password?token=xxx
    return {
      email_exists: true,
      email: user.getEmail(),
      token,
      first_name: user.getFirstName(),
    };
  }
}
