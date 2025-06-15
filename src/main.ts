import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS with appropriate configuration for production
  app.enableCors({
    origin: true, // Allow all origins (you can specify domains in production)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, // Enable credentials (cookies, authorization headers)
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });
  await app.listen(3001); // Using port 3001 to avoid conflict with Next.js frontend
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
