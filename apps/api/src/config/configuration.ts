export interface AppConfig {
  nodeEnv: string;
  port: number;
  host: string;
  apiPrefix: string;
  corsOrigins: string[];
  database: {
    url: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  jwt: {
    accessSecret: string;
    accessExpiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  storage: {
    endpoint: string;
    port: number;
    useSsl: boolean;
    accessKey: string;
    secretKey: string;
    buckets: {
      documents: string;
      photos: string;
      reports: string;
    };
  };
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.API_PORT || '4000', 10),
  host: process.env.API_HOST || '0.0.0.0',
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/school_management_db?schema=public',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_do_not_use_in_prod_12345678',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_do_not_use_in_prod_12345678',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  storage: {
    endpoint: process.env.STORAGE_ENDPOINT || 'localhost',
    port: parseInt(process.env.STORAGE_PORT || '9000', 10),
    useSsl: process.env.STORAGE_USE_SSL === 'true',
    accessKey: process.env.STORAGE_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.STORAGE_SECRET_KEY || 'minioadmin',
    buckets: {
      documents: process.env.STORAGE_BUCKET_DOCUMENTS || 'school-documents',
      photos: process.env.STORAGE_BUCKET_PHOTOS || 'school-photos',
      reports: process.env.STORAGE_BUCKET_REPORTS || 'school-reports',
    },
  },
});
