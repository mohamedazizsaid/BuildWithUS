import { validateEnv, z } from '@winaity/shared-kernel';

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export interface NatsConfig {
  servers: string[];
  streamName: string;
  consumerGroup: string;
}

export interface ConsulConfig {
  host: string;
  port: number;
  serviceName: string;
  serviceId: string;
}

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().default(3002),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().default(5437),
  DB_USER: z.string().default('winaity'),
  DB_PASSWORD: z.string().default('winaity_dev'),
  DB_NAME: z.string().default('templates_db'),
  NATS_URL: z.string().default('nats://localhost:4222'),
  NATS_STREAM_NAME: z.string().default('TEMPLATE_EVENTS'),
  NATS_CONSUMER_GROUP: z.string().default('template-service-consumers'),
  CONSUL_HOST: z.string().default('localhost'),
  CONSUL_PORT: z.coerce.number().int().default(8500),
  CONSUL_SERVICE_NAME: z.string().default('template-service'),
  CONSUL_SERVICE_ID: z.string().default('template-service-1'),
  LOG_LEVEL: z.string().default('debug'),
});

const env = validateEnv(envSchema);

export const configuration = () => ({
  env: env.NODE_ENV,
  port: env.PORT,

  database: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  } as DatabaseConfig,

  nats: {
    servers: env.NATS_URL.split(','),
    streamName: env.NATS_STREAM_NAME,
    consumerGroup: env.NATS_CONSUMER_GROUP,
  } as NatsConfig,

  consul: {
    host: env.CONSUL_HOST,
    port: env.CONSUL_PORT,
    serviceName: env.CONSUL_SERVICE_NAME,
    serviceId: env.CONSUL_SERVICE_ID,
  } as ConsulConfig,

  logger: {
    level: env.LOG_LEVEL,
  },
});

export type AppConfig = ReturnType<typeof configuration>;
