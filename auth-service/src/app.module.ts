import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';

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
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USER', 'winaity'),
        password: config.get('DB_PASSWORD', 'winaity_dev'),
        database: config.get('DB_NAME', 'auth_db'),
        autoLoadEntities: true,
        // Auto-create/alter tables. Dangerous in production (can drop data on
        // schema drift), so OFF when NODE_ENV=production. For the FIRST deploy
        // on an empty DB, set DB_SYNC=true once to create the tables, then set
        // it back to false. Dev keeps working automatically.
        synchronize:
          config.get('NODE_ENV') !== 'production' ||
          config.get('DB_SYNC') === 'true',
      }),
    }),
    AuthModule,
  ],
})
export class AppModule {}
