export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Enterprise School Management System',
  isProduction: process.env.NODE_ENV === 'production',
};
