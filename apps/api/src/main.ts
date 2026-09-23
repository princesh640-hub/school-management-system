import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyHelmet from '@fastify/helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { PrismaService } from './core/database/prisma.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Initialize Fastify Adapter
  const fastifyAdapter = new FastifyAdapter({
    logger: process.env.NODE_ENV === 'development',
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter,
  );

  // Security Headers via Helmet
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false, // Allows Swagger UI to render correctly
  });

  // Enable CORS
  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',');
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // API Versioning Prefix
  const apiPrefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // Global Input Validation & Transformation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Filters & Interceptors
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformResponseInterceptor());

  // Register Audit Interceptor
  const prismaService = app.get(PrismaService);
  app.useGlobalInterceptors(new AuditInterceptor(prismaService));

  // OpenAPI / Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('School Management System API')
    .setDescription(
      'Enterprise-grade Central REST API specification for School Management System (Web, Mobile, Desktop)',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Health', 'Health status and dependencies probe')
    .addTag('Authentication', 'Authentication, session renewal, and credentials')
    .addTag('Users', 'User accounts and profile administration')
    .addTag('Roles & Permissions', 'RBAC and fine-grained authorization')
    .addTag('Students', 'Student records and enrollments')
    .addTag('Academics', 'Academic structure and courses')
    .addTag('Fees', 'Financial billing and fee structures')
    .addTag('Reports', 'Bulk reports and asynchronous queue workers')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = parseInt(process.env.API_PORT || '4000', 10);
  const host = process.env.API_HOST || '0.0.0.0';

  await app.listen(port, host);

  logger.log(`====================================================`);
  logger.log(`School Management API started successfully`);
  logger.log(`Base URL:     http://${host}:${port}/${apiPrefix}`);
  logger.log(`Swagger Docs: http://${host}:${port}/docs`);
  logger.log(`Environment:  ${process.env.NODE_ENV || 'development'}`);
  logger.log(`====================================================`);
}

bootstrap();
