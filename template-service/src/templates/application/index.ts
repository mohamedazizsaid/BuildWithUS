// Commands
export * from './commands/index.js';
export * from './commands/handlers/index.js';

// Queries
export * from './queries/index.js';
export * from './queries/handlers/index.js';

// Event Handlers
export * from './events/index.js';

// Re-export handler arrays for module registration
import { CreateTemplateHandler } from './commands/handlers/create-template.handler.js';
import { UpdateTemplateHandler } from './commands/handlers/update-template.handler.js';
import { DeleteTemplateHandler } from './commands/handlers/delete-template.handler.js';

import { HealthCheckHandler } from './queries/handlers/health-check.handler.js';
import { GetTemplateHandler } from './queries/handlers/get-template.handler.js';
import { ListTemplatesHandler } from './queries/handlers/list-templates.handler.js';
import { RenderTemplateHandler } from './queries/handlers/render-template.handler.js';

import { TemplateCreatedHandler } from './events/template-created.handler.js';
import { TemplateUpdatedHandler } from './events/template-updated.handler.js';
import { TemplateDeletedHandler } from './events/template-deleted.handler.js';

/**
 * All command handlers for module registration
 */
export const CommandHandlers = [
  CreateTemplateHandler,
  UpdateTemplateHandler,
  DeleteTemplateHandler,
];

/**
 * All query handlers for module registration
 */
export const QueryHandlers = [
  HealthCheckHandler,
  GetTemplateHandler,
  ListTemplatesHandler,
  RenderTemplateHandler,
];

/**
 * All event handlers for module registration
 */
export const EventHandlers = [
  TemplateCreatedHandler,
  TemplateUpdatedHandler,
  TemplateDeletedHandler,
];
