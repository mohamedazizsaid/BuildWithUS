import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Infrastructure - ORM entities
import { TenantOrmEntity } from './infrastructure/persistence/entities/tenant.orm-entity';
import { UserOrmEntity } from './infrastructure/persistence/entities/user.orm-entity';

// Infrastructure - gRPC controller
import { AuthGrpcController } from './infrastructure/grpc/auth.grpc-controller';

// Infrastructure - repository implementations
import { TenantRepositoryImpl } from './infrastructure/persistence/repositories/tenant.repository.impl';
import { UserRepositoryImpl } from './infrastructure/persistence/repositories/user.repository.impl';

// Application - services
import { PasswordService } from './application/services/password.service';
import { JwtService } from './application/services/jwt.service';

// Application - command handlers
import { RegisterHandler } from './application/commands/handlers/register.handler';
import { LoginHandler } from './application/commands/handlers/login.handler';

const CommandHandlers = [RegisterHandler, LoginHandler];

@Module({
  imports: [
    CqrsModule,
    ConfigModule,
    TypeOrmModule.forFeature([TenantOrmEntity, UserOrmEntity]),
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
  ],
})
export class AuthModule {}
