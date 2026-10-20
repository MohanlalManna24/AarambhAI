import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';
import { ensureDatabaseIndexes } from '../models/schemas.js';

let isMongoConnected = false;

export async function connectDatabase(): Promise<{ mode: 'mongodb' | 'durable-document-store' }> {
  const uri = env.MONGODB_URI?.trim();
  if (uri && !uri.includes('<db_username>') && !uri.includes('<db_user>')) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10,
      });
      isMongoConnected = true;
      await ensureDatabaseIndexes();
      logger.info('Connected to MongoDB deployment and synchronized indexes.');
      return { mode: 'mongodb' };
    } catch (err) {
      logger.warn('MongoDB URI unreachable; activating Mongoose-validated durable local document store.', {
        reason: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  } else {
    logger.info('Using Mongoose-validated durable local document store (configure MONGODB_URI for Atlas).');
  }
  isMongoConnected = false;
  return { mode: 'durable-document-store' };
}

export async function disconnectDatabase(): Promise<void> {
  if (isMongoConnected && mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isMongoConnected = false;
    logger.info('Disconnected from MongoDB deployment.');
  }
}

export function getDatabaseStatus() {
  return {
    connected: true,
    engine: isMongoConnected && mongoose.connection.readyState === 1 ? 'mongodb-atlas' : 'mongoose-durable-store',
    mongooseReadyState: mongoose.connection.readyState,
  };
}
