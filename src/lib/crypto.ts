// Client-side encryption using Web Crypto API
// PBKDF2 for key derivation + AES-256-GCM for authenticated encryption

const PBKDF2_ITERATIONS = 310000; // OWASP recommended minimum for PBKDF2-HMAC-SHA256
const SALT_LENGTH = 32;
const IV_LENGTH = 12; // 96 bits for AES-GCM

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' } as AlgorithmIdentifier,
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    } as Pbkdf2Params,
    keyMaterial,
    { name: 'AES-GCM', length: 256 } as AesKeyGenParams,
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const iv = generateIV();
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    encoder.encode(plaintext)
  );

  // Combine IV + encrypted data
  const encBytes = new Uint8Array(encrypted);
  const combined = new Uint8Array(iv.length + encBytes.length);
  combined.set(iv);
  combined.set(encBytes, iv.length);

  return arrayBufferToBase64(combined.buffer as ArrayBuffer);
}

export async function decrypt(ciphertext: string, key: CryptoKey): Promise<string> {
  const combined = new Uint8Array(base64ToArrayBuffer(ciphertext));
  const iv = combined.slice(0, IV_LENGTH);
  const data = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

export async function hashPassword(password: string, salt: Uint8Array): Promise<string> {
  const key = await deriveKey(password, salt);
  const exported = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exported);
}

export function generateSaltString(): string {
  const salt = generateSalt();
  return arrayBufferToBase64(salt.buffer as ArrayBuffer);
}

export function saltFromString(saltStr: string): Uint8Array {
  const buf = base64ToArrayBuffer(saltStr);
  return new Uint8Array(buf as ArrayBuffer);
}

export function generatePassword(length: number = 20, options: {
  uppercase?: boolean;
  lowercase?: boolean;
  numbers?: boolean;
  symbols?: boolean;
  excludeAmbiguous?: boolean;
} = {}): string {
  const {
    uppercase = true,
    lowercase = true,
    numbers = true,
    symbols = true,
    excludeAmbiguous = false,
  } = options;

  let chars = '';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const nums = '0123456789';
  const syms = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const ambiguous = 'O0lI1|`\'"\\';

  if (uppercase) chars += upper;
  if (lowercase) chars += lower;
  if (numbers) chars += nums;
  if (symbols) chars += syms;

  if (excludeAmbiguous) {
    chars = chars.split('').filter(c => !ambiguous.includes(c)).join('');
  }

  if (chars.length === 0) chars = lower + nums;

  const array = new Uint32Array(length);
  crypto.getRandomValues(array);

  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[array[i] % chars.length];
  }

  return password;
}

export function calculatePasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!password) return { score: 0, label: 'None', color: '#ef4444' };

  let score = 0;
  const length = password.length;

  // Length scoring
  if (length >= 8) score += 1;
  if (length >= 12) score += 1;
  if (length >= 16) score += 1;
  if (length >= 20) score += 1;

  // Character variety
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  // Bonus for mixed
  if (/[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password)) {
    score += 2;
  }

  // Penalty for common patterns
  if (/^[a-z]+$/i.test(password)) score -= 1;
  if (/^[0-9]+$/.test(password)) score -= 2;
  if (/(.)\1{2,}/.test(password)) score -= 1;

  score = Math.max(0, Math.min(10, score));

  if (score <= 2) return { score, label: 'Very Weak', color: '#ef4444' };
  if (score <= 4) return { score, label: 'Weak', color: '#f97316' };
  if (score <= 6) return { score, label: 'Fair', color: '#eab308' };
  if (score <= 8) return { score, label: 'Strong', color: '#22c55e' };
  return { score, label: 'Very Strong', color: '#10b981' };
}

export async function exportEncryptedBackup(data: string, masterKey: CryptoKey): Promise<string> {
  const encrypted = await encrypt(data, masterKey);
  return JSON.stringify({
    version: '1.0',
    encrypted: true,
    algorithm: 'AES-256-GCM',
    kdf: 'PBKDF2',
    timestamp: new Date().toISOString(),
    data: encrypted,
  });
}

export async function importEncryptedBackup(backupJson: string, masterKey: CryptoKey): Promise<string> {
  const backup = JSON.parse(backupJson);
  if (!backup.encrypted || !backup.data) {
    throw new Error('Invalid backup format');
  }
  return decrypt(backup.data, masterKey);
}
