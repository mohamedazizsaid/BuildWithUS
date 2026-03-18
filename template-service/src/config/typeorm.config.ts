/**
 * TypeORM Configuration Factory
 * Reusable TypeORM configuration for runtime and CLI tools
 */

import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { DatabaseConfig } from './configuration.js';

/**
 * Create generic TypeORM configuration
 * Can be used by both NestJS and TypeORM CLI
 */
export function createTypeOrmConfig(dbConfig: DatabaseConfig): DataSourceOptions {
  return {
    type: 'postgres',
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
    entities: ['dist/src/**/*.orm-entity.{ts,js}'],
    migrations: ['dist/src/**/infrastructure/persistence/migrations/*-*.{ts,js}'],
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : false,
  };
}

/**
 * Create NestJS-specific TypeORM configuration
 * Includes autoLoadEntities for better DX in NestJS
 */
export function createNestTypeOrmConfig(dbConfig: DatabaseConfig): TypeOrmModuleOptions {
  return {
    ...createTypeOrmConfig(dbConfig),
    autoLoadEntities: true, // Auto-discover entities from modules
  };
}

/**
 * DataSource for TypeORM CLI (migrations)
 * Usage: typeorm-ts-node-commonjs migration:generate -d src/config/typeorm.config.ts
 */
export const AppDataSource = new DataSource(
  createTypeOrmConfig({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5437', 10),
    username: process.env.DB_USER || 'winaity',
    password: process.env.DB_PASSWORD || 'winaity_dev',
    database: process.env.DB_NAME || 'templates_db',
  }),
);
