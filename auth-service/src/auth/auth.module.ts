import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Infrastructure - ORM entities
import { TenantOrmEntity } from './infrastructure/persistence/entities/tenant.orm-entity';
import { UserOrmEntity } from './infrastructure/persistence/entities/user.orm-entity';
import { InviteOrmEntity } from './infrastructure/persistence/entities/invite.orm-entity';

// Infrastructure - gRPC controller
import { AuthGrpcController } from './infrastructure/grpc/auth.grpc-controller';

// Infrastructure - repository implementations
import { TenantRepositoryImpl } from './infrastructure/persistence/repositories/tenant.repository.impl';
import { UserRepositoryImpl } from './infrastructure/persistence/repositories/user.repository.impl';
import { InviteRepositoryImpl } from './infrastructure/persistence/repositories/invite.repository.impl';

// Domain - repository interfaces
import { UserRepository } from './domain/repositories/user.repository';
import { TenantRepository } from './domain/repositories/tenant.repository';

// Application - services
import { PasswordService } from './application/services/password.service';
import { JwtService } from './application/services/jwt.service';

// Application - command handlers
import { RegisterHandler } from './application/commands/handlers/register.handler';
import { LoginHandler } from './application/commands/handlers/login.handler';
import { InviteUserHandler } from './application/commands/handlers/invite-user.handler';
import { AcceptInviteHandler } from './application/commands/handlers/accept-invite.handler';

const CommandHandlers = [RegisterHandler, LoginHandler, InviteUserHandler, AcceptInviteHandler];

@Module({
  imports: [
    CqrsModule,
    ConfigModule,
    TypeOrmModule.forFeature([TenantOrmEntity, UserOrmEntity, InviteOrmEntity]),
  ],
  controllers: [AuthGrpcController],
  providers: [
    ...CommandHandlers,
    PasswordService,
    JwtService,
    {
      provide: 'TENANT_REPOSITORY',
      useClass: TenantRepositoryImpl,
    },
    {
      provide: 'USER_REPOSITORY',
      useClass: UserRepositoryImpl,
    },
    {
      provide: 'INVITE_REPOSITORY',
      useClass: InviteRepositoryImpl,
    },
    {
      provide: UserRepository,
      useClass: UserRepositoryImpl,
    },
    {
      provide: TenantRepository,
      useClass: TenantRepositoryImpl,
    },
  ],
})
export class AuthModule {}
