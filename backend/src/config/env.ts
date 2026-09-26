import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface EnvConfig {
  PORT: number;
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  ENCRYPTION_MASTER_KEY: string;
  CLIENT_URL: string;
  NODE_ENV: string;
}

function validateEnv(): EnvConfig {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('FATAL: MONGODB_URI environment variable is required');
  }

  const ENCRYPTION_MASTER_KEY = process.env.ENCRYPTION_MASTER_KEY;
  if (!ENCRYPTION_MASTER_KEY || ENCRYPTION_MASTER_KEY.length < 32) {
    throw new Error('FATAL: ENCRYPTION_MASTER_KEY must be at least 32 characters long');
  }

  return {
    PORT: parseInt(process.env.PORT || '5000', 10),
    MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret_development_only_12345',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_development_only_12345',
    ENCRYPTION_MASTER_KEY,
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
    NODE_ENV: process.env.NODE_ENV || 'development',
  };
}

export const env = validateEnv();
