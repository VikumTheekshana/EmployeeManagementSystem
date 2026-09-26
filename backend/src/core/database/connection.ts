import mongoose from 'mongoose';
import { env } from '../../config/env';

/**
 * Connect to MongoDB Atlas with optimized M0 Free Tier connection pooling
 */
export async function connectToDatabase(): Promise<typeof mongoose> {
  try {
    // Prevent multiple connections in dev
    if (mongoose.connection.readyState >= 1) {
      return mongoose;
    }

    mongoose.connection.on('connected', () => {
      console.log(' [MongoDB Atlas] Connected successfully with M0 connection pool limit (maxPoolSize: 10).');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ [MongoDB Atlas] Connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ [MongoDB Atlas] Disconnected from database.');
    });

    const conn = await mongoose.connect(env.MONGODB_URI, {
      maxPoolSize: 10, // Strict M0 Atlas connection pooling constraint
      minPoolSize: 2,
      serverSelectionTimeoutMS: 10000,
      retryWrites: true,
      w: 'majority',
    });

    return conn;
  } catch (error: any) {
    console.error('❌ [MongoDB Atlas] Failed to connect:', error.message);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log(' [MongoDB Atlas] Database disconnected.');
  }
}
