import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address format'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  campusId: z.string().uuid().optional(),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(20, 'Invalid refresh token'),
});

export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'New password cannot be identical to the current password',
  path: ['newPassword'],
});

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
