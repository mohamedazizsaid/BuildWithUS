import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { AcceptInviteCommand } from '../accept-invite.command';
import { InviteRepository } from '../../../domain/repositories/invite.repository';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { User } from '../../../domain/entities/user.aggregate';
import { PasswordService } from '../../services/password.service';
import { JwtService } from '../../services/jwt.service';

@CommandHandler(AcceptInviteCommand)
export class AcceptInviteHandler implements ICommandHandler<AcceptInviteCommand> {
  private readonly logger = new Logger(AcceptInviteHandler.name);

  constructor(
    @Inject('INVITE_REPOSITORY')
    private readonly inviteRepository: InviteRepository,
    @Inject('USER_REPOSITORY')
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  async execute(command: AcceptInviteCommand) {
    this.logger.debug('Accepting invite via token');

    // Verify the invite token (will throw if expired or invalid)
    let invitePayload;
    try {
      invitePayload = this.jwtService.verifyInvite(command.token);
    } catch {
      throw new Error('Invalid or expired invite link');
    }

    // Find the invite in DB
    const invite = await this.inviteRepository.findById(invitePayload.inviteId);
    if (!invite) {
      throw new Error('Invite not found');
    }

    if (invite.getStatus() !== 'pending') {
      throw new Error('Invite has already been used');
    }

    // Check if email already registered
    const existingUser = await this.userRepository.findByEmail(invitePayload.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Accept the invite
    invite.accept();
    await this.inviteRepository.save(invite);

    // Create user with the role set by admin
    const hashedPassword = await this.passwordService.hash(command.password);
    const user = User.create(
      invitePayload.tenantId,
      invitePayload.email,
      hashedPassword,
      command.firstName,
      command.lastName,
      invitePayload.role,
    );

    await this.userRepository.save(user);
    this.logger.log(`User created from invite: ${user.getId()}`);

    // Return auth JWT
    const token = this.jwtService.sign({
      userId: user.getId(),
      tenantId: invitePayload.tenantId,
      email: user.getEmail(),
      role: user.getRole(),
    });

    return {
      token,
      user: {
        id: user.getId(),
        tenantId: invitePayload.tenantId,
        email: user.getEmail(),
        firstName: user.getFirstName(),
        lastName: user.getLastName(),
        role: user.getRole(),
      },
    };
  }
}
