/**
 * Auth Error Types and Messages
 * Provides precise, localizable error codes for authentication flows
 */

export type AuthErrorCode =
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_UNVERIFIED_EMAIL'
  | 'AUTH_USER_INACTIVE'
  | 'AUTH_RATE_LIMITED'
  | 'AUTH_LOCKED'
  | 'AUTH_MFA_REQUIRED'
  | 'AUTH_INTERNAL';

export function errorMessage(code: AuthErrorCode): string {
  switch (code) {
    case 'AUTH_INVALID_CREDENTIALS':
      return 'Ungültige E-Mail oder Passwort.';
    case 'AUTH_UNVERIFIED_EMAIL':
      return 'Bitte bestätige zunächst deine E-Mail-Adresse.';
    case 'AUTH_USER_INACTIVE':
      return 'Dein Konto ist deaktiviert. Wende dich an den Support.';
    case 'AUTH_RATE_LIMITED':
      return 'Zu viele Versuche. Bitte warte kurz und versuche es erneut.';
    case 'AUTH_LOCKED':
      return 'Zu viele fehlgeschlagene Logins. Dein Konto ist vorübergehend gesperrt.';
    case 'AUTH_MFA_REQUIRED':
      return 'Mehrstufige Anmeldung erforderlich. Bitte gib den MFA-Code ein.';
    default:
      return 'Ein unerwarteter Fehler ist aufgetreten.';
  }
}

export type ApiError = { code: AuthErrorCode; message: string; details?: unknown };
export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError };
