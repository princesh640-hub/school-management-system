/**
 * ==============================================================================
 * Validation Architecture Specification & Responsibility Separation
 * ==============================================================================
 * 
 * 1. Zod (`@school/validation`):
 *    - Responsibility: Client-side runtime validation (Next.js React Hook Form,
 *      form submission boundaries, and browser input sanitization).
 *    - Advantages: Zero runtime `reflect-metadata` dependency, minimal bundle size,
 *      native TypeScript inference (`z.infer<T>`).
 * 
 * 2. Class-Validator & Class-Transformer (`apps/api`):
 *    - Responsibility: Server-side REST API request payload validation and
 *      automatic OpenAPI / Swagger schema model generation.
 *    - Advantages: Native NestJS `ValidationPipe` integration, declarative class DTOs,
 *      automatic Swagger UI parameter reflection.
 * ==============================================================================
 */

export * from './auth.schema.js';
export * from './pagination.schema.js';

