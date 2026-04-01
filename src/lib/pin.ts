import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hash a PIN using bcryptjs for secure storage
 */
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, SALT_ROUNDS);
}

/**
 * Verify a PIN against its bcrypt hash
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}
