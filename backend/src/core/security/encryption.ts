import crypto from 'crypto';
import { Schema } from 'mongoose';
import { env } from '../../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit nonce for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

// Derive a 32-byte key from master key using SHA-256
const KEY = crypto.createHash('sha256').update(env.ENCRYPTION_MASTER_KEY).digest();

/**
 * Encrypts a string using AES-256-GCM.
 * Output format: enc:v1:<iv_hex>:<authTag_hex>:<cipher_hex>
 */
export function encryptAES256GCM(plainText: string): string {
  if (!plainText) return plainText;
  // If already encrypted, return as is
  if (plainText.startsWith('enc:v1:')) return plainText;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');
  return `enc:v1:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a ciphertext formatted as enc:v1:<iv_hex>:<authTag_hex>:<cipher_hex>
 */
export function decryptAES256GCM(cipherPayload: string): string {
  if (!cipherPayload || !cipherPayload.startsWith('enc:v1:')) {
    return cipherPayload;
  }

  try {
    const parts = cipherPayload.split(':');
    if (parts.length !== 5) {
      throw new Error('Invalid encrypted payload format');
    }

    const ivHex = parts[2];
    const authTagHex = parts[3];
    const encryptedHex = parts[4];

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err: any) {
    console.error('Decryption failure:', err.message);
    return '[ENCRYPTED_DATA_DECRYPTION_ERROR]';
  }
}

/**
 * Masks sensitive strings (e.g. Bank Account: "******7890", NIC: "******123V")
 */
export function maskSensitive(
  value: string | undefined | null,
  visibleSuffixCount = 4,
  visiblePrefixCount = 0,
  maskChar = '*'
): string {
  if (!value) return '';
  let str = String(value);

  // If encrypted, decrypt first so we mask the actual plain text
  if (str.startsWith('enc:v1:')) {
    str = decryptAES256GCM(str);
  }

  if (str.length <= visibleSuffixCount + visiblePrefixCount) {
    return maskChar.repeat(str.length);
  }

  const prefix = str.slice(0, visiblePrefixCount);
  const suffix = str.slice(str.length - visibleSuffixCount);
  const maskedLength = Math.max(0, str.length - visiblePrefixCount - visibleSuffixCount);
  return `${prefix}${maskChar.repeat(maskedLength)}${suffix}`;
}

/**
 * Masks salary to standard formatted: "Rs. ******"
 */
export function maskSalary(salary: number | string | undefined | null): string {
  if (salary === undefined || salary === null || salary === '') return 'Rs. 0.00';
  return 'Rs. •••••••';
}

/**
 * Reusable Mongoose plugin for application-level Field-Level Encryption (FLE).
 * Encrypts listed fields on document pre-save and decrypts on post-init.
 */
export function fieldLevelEncryptionPlugin(schema: Schema, options: { fields: string[] }) {
  const { fields } = options;

  schema.pre('save', function (next) {
    const doc = this as any;
    for (const field of fields) {
      if (doc.isModified(field) && doc[field] !== undefined && doc[field] !== null) {
        const valStr = String(doc[field]);
        if (!valStr.startsWith('enc:v1:')) {
          doc[field] = encryptAES256GCM(valStr);
        }
      }
    }
    next();
  });

  schema.post('init', function (doc: any) {
    for (const field of fields) {
      if (doc[field] && typeof doc[field] === 'string' && doc[field].startsWith('enc:v1:')) {
        doc[field] = decryptAES256GCM(doc[field]);
      }
    }
  });
}
