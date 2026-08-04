// ============================================================================
// مِران (Miran) — Main Entrypoint
// National Health Training Management Platform
// ============================================================================

import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters';
import { AuditInterceptor } from './common/interceptors';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // CORS setup
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : '*';

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Global Prefix & API Versioning
  const apiPrefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['/', 'health', 'api/docs'],
  });
  app.enableVersioning({
    type: VersioningType.URI,
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global Audit Interceptor
  const prismaService = app.get(PrismaService);
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new AuditInterceptor(reflector, prismaService));

  // Production-Safe Swagger Documentation Setup
  const isSwaggerEnabled = process.env.SWAGGER_ENABLED !== 'false';
  if (isSwaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('مِران (Miran) API Documentation')
      .setDescription('المكتبة البرمجية لمنصة مِران الوطنية لإدارة التدريب الصحي ( v3.0 Enterprise )')
      .setVersion('3.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'أدخل رمز JWT هنا',
          in: 'header',
        },
        'JWT-auth',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Miran Platform backend running on port: ${port}`);
  if (isSwaggerEnabled) {
    console.log(`📚 Swagger documentation enabled at /api/docs`);
  }
}

bootstrap();
