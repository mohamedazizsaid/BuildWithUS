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
          url: process.env.AUTH_SERVICE_URL || 'localhost:50055',
          package: 'auth',
          protoPath: process.env.AUTH_PROTO_PATH || join(__dirname, '../../auth-service/proto/auth.proto'),
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
          url: process.env.TEMPLATE_SERVICE_URL || 'localhost:50054',
          package: 'templates.commands',
          protoPath: process.env.TEMPLATE_CMD_PROTO_PATH || join(__dirname, '../../packages/proto/template_commands.proto'),
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
          url: process.env.TEMPLATE_SERVICE_URL || 'localhost:50054',
          package: 'templates.queries',
          protoPath: process.env.TEMPLATE_QUERY_PROTO_PATH || join(__dirname, '../../packages/proto/template_queries.proto'),
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
