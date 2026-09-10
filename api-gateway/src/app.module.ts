import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AuthController,
  OAuthController,
  DevelopersController,
  IntegrationsController,
} from './controllers/auth.controller';
import { SuperAdminController } from './controllers/super-admin.controller';
import { TemplateController } from './controllers/template.controller';
import { MediaController } from './controllers/media.controller';
import { BillingController } from './controllers/billing.controller';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ScopesGuard } from './guards/scopes.guard';
import { PdfService } from './services/pdf.service';
import { TemplateRendererService } from './services/template-renderer.service';
import { AuthClientService } from './services/auth-client.service';
import { TemplateClientService } from './services/template-client.service';

/**
 * AppModule — the main module of the API Gateway.
 *
 * Microservices communication is 100% HTTP/REST via AuthClientService
 * and TemplateClientService.
 */
@Module({
  imports: [],
  controllers: [
    AuthController,
    OAuthController,
    DevelopersController,
    IntegrationsController,
    SuperAdminController,
    TemplateController,
    MediaController,
    BillingController,
  ],
  providers: [
    AuthClientService,
    TemplateClientService,
    AuthGuard,
    RolesGuard,
    ScopesGuard,
    Reflector,
    PdfService,
    TemplateRendererService,
  ],
})
export class AppModule {}
