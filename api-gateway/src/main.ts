import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.enableCors({
    origin: 'http://localhost:5173', // React dev server
    credentials: true,               // allow cookies
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`API Gateway running on http://localhost:${port}`);
}

bootstrap();
