import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AuthController } from '../src/controllers/auth.controller';
import { TemplateController } from '../src/controllers/template.controller';
import { AuthGuard } from '../src/guards/auth.guard';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'AUTH_SERVICE',
        transport: Transport.GRPC,
        options: {
          url: 'localhost:50055',
          package: 'auth',
          protoPath: join(__dirname, '../../auth-service/proto/auth.proto'),
          loader: {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
          },
        },
      },
      {
        name: 'TEMPLATE_COMMAND_SERVICE',
        transport: Transport.GRPC,
        options: {
          url: 'localhost:50054',
          package: 'templates.commands',
          protoPath: join(__dirname, '../../packages/proto/template_commands.proto'),
          loader: {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
          },
        },
      },
      {
        name: 'TEMPLATE_QUERY_SERVICE',
        transport: Transport.GRPC,
        options: {
          url: 'localhost:50054',
          package: 'templates.queries',
          protoPath: join(__dirname, '../../packages/proto/template_queries.proto'),
          loader: {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
          },
        },
      },
    ]),
  ],
  controllers: [AuthController, TemplateController],
  providers: [AuthGuard],
})
export class AppModule {}
