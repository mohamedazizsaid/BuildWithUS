import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AuthController } from '../src/controllers/auth.controller';
import { TemplateController } from '../src/controllers/template.controller';
import { AuthGuard } from '../src/guards/auth.guard';

/**
 * AppModule — the main module of the API Gateway.
 *
 * Registers 3 gRPC CLIENTS (phone lines to microservices):
 * - AUTH_SERVICE            → auth-service on port 50055
 * - TEMPLATE_COMMAND_SERVICE → template-service on port 50054 (write operations)
 * - TEMPLATE_QUERY_SERVICE   → template-service on port 50054 (read operations)
 *
 * Each client loads a .proto file to know what RPCs are available
 * and what shape the messages have.
 */
@Module({
  imports: [
    ClientsModule.register([
      // ─── Auth Service Client ───
      // Used by: AuthController (register, login, invite, etc.)
      // Used by: AuthGuard (ValidateToken on every protected request)
      {
        name: 'AUTH_SERVICE',
        transport: Transport.GRPC,
        options: {
          url: process.env.AUTH_SERVICE_URL || 'localhost:50055',
          package: 'auth', // matches "package auth;" in auth.proto
          protoPath: process.env.AUTH_PROTO_PATH || join(__dirname, '../../auth-service/proto/auth.proto'),
          loader: {
            keepCase: true,   // keep snake_case field names (tenant_id, not tenantId)
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
          },
        },
      },
      // ─── Template Command Service Client ───
      // Used by: TemplateController (create, update, delete, duplicate)
      // Connects to the WRITE side of the template service (CQRS)
      {
        name: 'TEMPLATE_COMMAND_SERVICE',
        transport: Transport.GRPC,
        options: {
          url: process.env.TEMPLATE_SERVICE_URL || 'localhost:50054',
          package: 'templates.commands', // matches "package templates.commands;" in proto
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
      // ─── Template Query Service Client ───
      // Used by: TemplateController (list, get, render)
      // Connects to the READ side of the template service (CQRS)
      // Same port as command service — both live in the same process
      {
        name: 'TEMPLATE_QUERY_SERVICE',
        transport: Transport.GRPC,
        options: {
          url: process.env.TEMPLATE_SERVICE_URL || 'localhost:50054',
          package: 'templates.queries', // matches "package templates.queries;" in proto
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
  controllers: [AuthController, TemplateController], // REST controllers that handle HTTP requests
  providers: [AuthGuard], // The JWT guard, injectable into any controller
})
export class AppModule {}
