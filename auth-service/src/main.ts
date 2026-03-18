import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

async function bootstrap() {
  const grpcPort = process.env.GRPC_PORT || '50055';

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        url: `0.0.0.0:${grpcPort}`,
        package: 'auth',
        protoPath: join(__dirname, '../proto/auth.proto'),
      },
    },
  );

  await app.listen();
  console.log(`Auth service running on gRPC port ${grpcPort}`);
}

bootstrap();
