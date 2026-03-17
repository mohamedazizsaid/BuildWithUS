import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { HealthCheckQuery } from '../health-check.query.js';
import type { HealthCheckResponse } from 'proto/generated/common';

/**
 * Health Check Handler
 *
 * Handles health check queries.
 */
@QueryHandler(HealthCheckQuery)
export class HealthCheckHandler implements IQueryHandler<HealthCheckQuery, HealthCheckResponse> {
  private readonly logger = new Logger(HealthCheckHandler.name);

  async execute(_query: HealthCheckQuery): Promise<HealthCheckResponse> {
    this.logger.debug('Health check requested');

    return {
      status: 'serving',
      serviceName: 'template-service',
      version: '1.0.0',
    };
  }
}
