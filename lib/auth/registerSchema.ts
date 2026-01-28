/**
 * Registration Schema with Password Policy
 * Validates user registration input
 */

import { z } from 'zod';

export const registerSchema = z
  .object({
    displayName: z.string().min(2, 'Name muss mindestens 2 Zeichen lang sein'),
    email: z.string().email('Ungültige E-Mail-Adresse'),
    password: z
      .string()
      .min(8, 'Passwort muss mindestens 8 Zeichen lang sein')
      .regex(/[A-Z]/, 'Passwort muss mindestens einen Großbuchstaben enthalten')
      .regex(/[0-9]/, 'Passwort muss mindestens eine Zahl enthalten')
      .regex(/[^A-Za-z0-9]/, 'Passwort muss mindestens ein Sonderzeichen enthalten'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwörter stimmen nicht überein',
    path: ['confirmPassword'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
