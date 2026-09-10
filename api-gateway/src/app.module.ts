import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { existsSync } from 'fs';
import { AuthController, OAuthController, DevelopersController, IntegrationsController } from './controllers/auth.controller';
import { SuperAdminController } from './controllers/super-admin.controller';
import { TemplateController } from './controllers/template.controller';
import { MediaController } from './controllers/media.controller';
import { BillingController } from './controllers/billing.controller';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ScopesGuard } from './guards/scopes.guard';
import { Reflector } from '@nestjs/core';
import { PdfService } from './services/pdf.service';
import { TemplateRendererService } from './services/template-renderer.service';

const resolveProto = (envVar: string | undefined, localRel: string, fallbackRel: string): string => {
  if (envVar) return envVar;
  const local = join(__dirname, localRel);
  if (existsSync(local)) return local;
  return join(__dirname, fallbackRel);
};

const protoIncludeDirs = [
  join(__dirname, '../proto'),
  join(__dirname, '../../packages/proto'),
  join(__dirname, '../../auth-service/proto'),
].filter((d) => existsSync(d));

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
          protoPath: resolveProto(
            process.env.AUTH_PROTO_PATH,
            '../proto/auth.proto',
            '../../auth-service/proto/auth.proto',
          ),
          loader: {
            keepCase: true,   // keep snake_case field names (tenant_id, not tenantId)
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
            includeDirs: protoIncludeDirs,
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
          protoPath: resolveProto(
            process.env.TEMPLATE_CMD_PROTO_PATH,
            '../proto/template_commands.proto',
            '../../packages/proto/template_commands.proto',
          ),
          loader: {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
            includeDirs: protoIncludeDirs,
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
          protoPath: resolveProto(
            process.env.TEMPLATE_QUERY_PROTO_PATH,
            '../proto/template_queries.proto',
            '../../packages/proto/template_queries.proto',
          ),
          loader: {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
            includeDirs: protoIncludeDirs,
          },
        },
      },
    ]),
  ],
  controllers: [AuthController, OAuthController, DevelopersController, IntegrationsController, SuperAdminController, TemplateController, MediaController, BillingController], // REST controllers that handle HTTP requests
  providers: [AuthGuard, RolesGuard, ScopesGuard, Reflector, PdfService, TemplateRendererService],
})
export class AppModule {}
