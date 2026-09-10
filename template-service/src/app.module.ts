import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplatesModule } from './templates/templates.module.js';
import { configuration, AppConfig, DatabaseConfig, createNestTypeOrmConfig } from './config/index.js';
import { LoggerModule } from '@winaity/shared-kernel';

@Module({
  imports: [
    // Global configuration module with typed config factory
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // TypeORM with typed configuration
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig>) => {
        const dbConfig = configService.get<DatabaseConfig>('database', { infer: true })!;
        return createNestTypeOrmConfig(dbConfig);
      },
    }),

    // Logger module from shared-kernel
    LoggerModule,

    // Feature modules
    TemplatesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
