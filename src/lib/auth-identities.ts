/** Canonical account email (Supabase Auth). */
export const OWNER_EMAIL = 'codyfairburn19@gmail.com';

/** Username alias — compare case-insensitively only against this normalized form. */
const OWNER_USERNAME_NORMALIZED = 'ironcanuck19';

/**
 * Map login identifier to the email used with Supabase Auth.
 * Username matching ignores case; email must match this account (any casing).
 */
export function resolveAuthEmail(usernameOrEmail: string): string | null {
  const raw = usernameOrEmail.trim();
  if (!raw) return null;

  if (raw.includes('@')) {
    return raw.toLowerCase() === OWNER_EMAIL.toLowerCase() ? OWNER_EMAIL : null;
  }

  return raw.toLowerCase() === OWNER_USERNAME_NORMALIZED ? OWNER_EMAIL : null;
}
