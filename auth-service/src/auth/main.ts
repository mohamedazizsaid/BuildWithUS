import {NestFactory} from '@nestjs/core';
import { AppModule } from './app.module';
import {Transport, MicroserviceOptions} from '@nestjs/microservices';
import {join} from 'path';

async function bootsrap(){
    const grpcPort = process.env.GRPC_PORT || '50055';

    const app = await NestFactory.createMicroservice<MicroserviceOptions>(
        AppModule,
        {
            transport: Transport.GRPC,
            options: {
                url: '0.0.0.0:${grpcPort}',
                package: 'auth',
                protoPath: join(__dirname, '../proto/auth.proto'),
            },
        },
    );
    await app.listen();
    console.log(`Auth Microservice is running on port ${grpcPort}`);
}

bootsrap();