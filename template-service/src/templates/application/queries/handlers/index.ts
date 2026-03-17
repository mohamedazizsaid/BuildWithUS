export { HealthCheckHandler } from './health-check.handler.js';
export { GetTemplateHandler } from './get-template.handler.js';
export { ListTemplatesHandler } from './list-templates.handler.js';
export { GetPopularTemplatesHandler } from './get-popular-templates.handler.js';
export { RenderTemplateHandler } from './render-template.handler.js';

// Re-export proto types for convenience
export type { HealthCheckResponse } from 'proto/generated/common';
export type {
  ListTemplatesResponse,
  GetPopularTemplatesResponse,
  PaginationInfo,
  RenderTemplateResponse,
} from 'proto/generated/template_queries';
