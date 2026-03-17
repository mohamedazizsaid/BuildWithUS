import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

config({ path: process.env.DOTENV_PATH || '.env' });

// NestJS build outputs to dist/src/, not dist/
const distConfigPath = join(__dirname, 'dist', 'src', 'config');
const srcConfigPath = join(__dirname, 'src', 'config');
const useDistConfig = existsSync(distConfigPath);

const configModulePath = useDistConfig
  ? join(distConfigPath, 'configuration.js')
  : join(srcConfigPath, 'configuration');

const typeOrmModulePath = useDistConfig
  ? join(distConfigPath, 'typeorm.config.js')
  : join(srcConfigPath, 'typeorm.config');

const { configuration } = require(configModulePath);
const { createTypeOrmConfig } = require(typeOrmModulePath);

const entities = [
  useDistConfig
    ? join(__dirname, 'dist', 'src', '**', '*.orm-entity.js')
    : join(__dirname, 'src', '**', '*.orm-entity.ts'),
];

const migrations = [
  useDistConfig
    ? join(__dirname, 'dist', 'src', 'templates', 'infrastructure', 'persistence', 'migrations', '*-*.js')
    : join(__dirname, 'src', 'templates', 'infrastructure', 'persistence', 'migrations', '*-*.ts'),
];

const loggingEnabled =
  process.env.TYPEORM_LOGGING === 'true' ||
  process.env.NODE_ENV === 'development';

const dbConfig = configuration().database;

const dataSource = new DataSource(
  process.env.DATABASE_URL
    ? {
        type: 'postgres',
        url: process.env.DATABASE_URL,
        entities,
        migrations,
        synchronize: false,
        logging: loggingEnabled,
      }
    : createTypeOrmConfig(dbConfig, {
        entities,
        migrations,
        synchronize: false,
        logging: loggingEnabled,
      }),
);

export default dataSource;
