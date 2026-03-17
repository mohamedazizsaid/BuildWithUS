import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
@Module({
    imports: [
        ConfigModule.forRoot({
            envFilePath: '.env.development',
            isGlobal: true,
        }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                type: 'postgres',
                host: config.get('DB_HOST','Localhost'),
                port: config.get('DB_PORT',5432),
                username: config.get('DB_USER','winaity'),
                password: config.get('DB_PASSWORD','winaity_dev'),
                database: config.get('DB_NAME','auth_db'),
                autoLoadEntities: true,
                synchronize: true, //dev only - creates tables automatically
            }),
        }),
        AuthModule
    ],
})
export class AppModule {}