import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { InviteUserCommand } from '../invite-user.command';
import { InviteRepository } from '../../../domain/repositories/invite.repository';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { Invite } from '../../../domain/entities/invite.aggregate';
import { JwtService } from '../../services/jwt.service';

@CommandHandler(InviteUserCommand)
export class InviteUserHandler implements ICommandHandler<InviteUserCommand> {
  private readonly logger = new Logger(InviteUserHandler.name);

  constructor(
    @Inject('INVITE_REPOSITORY')
    private readonly inviteRepository: InviteRepository,
    @Inject('USER_REPOSITORY')
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(command: InviteUserCommand) {
    this.logger.debug(`Inviting user: ${command.email} to tenant: ${command.tenantId}`);

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(command.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Check if there's already a pending invite for this email
    const existingInvite = await this.inviteRepository.findByEmail(command.email);
    if (existingInvite) {
      throw new Error('An invite is already pending for this email');
    }

    // Create invite
    const invite = Invite.create(
      command.tenantId,
      command.email,
      command.role,
      command.invitedBy,
    );

    await this.inviteRepository.save(invite);

    // Generate invite token (expires in 15 minutes)
    const token = this.jwtService.signInvite({
      inviteId: invite.getId(),
      tenantId: invite.getTenantId(),
      email: invite.getEmail(),
      role: invite.getRole(),
    });

    this.logger.log(`Invite created for ${command.email} (expires in 15min)`);

    // The frontend will build the link: https://app.winaity.com/invite?token=xxx
    return {
      invite: {
        id: invite.getId(),
        email: invite.getEmail(),
        role: invite.getRole(),
        token,
      },
    };
  }
}
