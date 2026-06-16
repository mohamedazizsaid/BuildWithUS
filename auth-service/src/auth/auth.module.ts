import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Infrastructure - ORM entities
import { TenantOrmEntity } from './infrastructure/persistence/entities/tenant.orm-entity';
import { UserOrmEntity } from './infrastructure/persistence/entities/user.orm-entity';
import { InviteOrmEntity } from './infrastructure/persistence/entities/invite.orm-entity';
import { ApiClientOrmEntity } from './infrastructure/persistence/entities/api-client.orm-entity';
import { BuilderSessionOrmEntity } from './infrastructure/persistence/entities/builder-session.orm-entity';

// Infrastructure - gRPC controller
import { AuthGrpcController } from './infrastructure/grpc/auth.grpc-controller';

// Infrastructure - repository implementations
import { TenantRepositoryImpl } from './infrastructure/persistence/repositories/tenant.repository.impl';
import { UserRepositoryImpl } from './infrastructure/persistence/repositories/user.repository.impl';
import { InviteRepositoryImpl } from './infrastructure/persistence/repositories/invite.repository.impl';
import { ApiClientRepositoryImpl } from './infrastructure/persistence/repositories/api-client.repository.impl';
import { BuilderSessionRepositoryImpl } from './infrastructure/persistence/repositories/builder-session.repository.impl';

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
import { RequestPasswordResetHandler } from './application/commands/handlers/request-password-reset.handler';
import { ResetPasswordHandler } from './application/commands/handlers/reset-password.handler';
import { GenerateApiClientHandler } from './application/commands/handlers/generate-api-client.handler';
import { IssueClientTokenHandler } from './application/commands/handlers/issue-client-token.handler';
import { RegisterApiClientHandler } from './application/commands/handlers/register-api-client.handler';
import { RegisterDeveloperHandler } from './application/commands/handlers/register-developer.handler';
import { MintBuilderSessionHandler } from './application/commands/handlers/mint-builder-session.handler';
import { ExchangeBuilderSessionHandler } from './application/commands/handlers/exchange-builder-session.handler';
import { UpdateAllowedReturnUrlsHandler } from './application/commands/handlers/update-allowed-return-urls.handler';

const CommandHandlers = [
  RegisterHandler,
  LoginHandler,
  InviteUserHandler,
  AcceptInviteHandler,
  RequestPasswordResetHandler,
  ResetPasswordHandler,
  GenerateApiClientHandler,
  IssueClientTokenHandler,
  RegisterApiClientHandler,
  RegisterDeveloperHandler,
  MintBuilderSessionHandler,
  ExchangeBuilderSessionHandler,
  UpdateAllowedReturnUrlsHandler,
];

@Module({
  imports: [
    CqrsModule,
    ConfigModule,
    TypeOrmModule.forFeature([
      TenantOrmEntity,
      UserOrmEntity,
      InviteOrmEntity,
      ApiClientOrmEntity,
      BuilderSessionOrmEntity,
    ]),
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
      provide: 'API_CLIENT_REPOSITORY',
      useClass: ApiClientRepositoryImpl,
    },
    {
      provide: 'BUILDER_SESSION_REPOSITORY',
      useClass: BuilderSessionRepositoryImpl,
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
