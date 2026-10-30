import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

export const connectDatabase = async (): Promise<void> => {
  try {
    mongoose.set('strictQuery', true);
    
    await mongoose.connect(env.MONGO_URI, {
      autoIndex: true, // Build indexes on startup in development
      serverSelectionTimeoutMS: 8000,
    });

    logger.info('Connected to MongoDB successfully');

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB connection lost. Reconnecting...');
    });
  } catch (error: any) {
    const isAtlas = env.MONGO_URI.includes('mongodb+srv') || env.MONGO_URI.includes('mongodb.net');

    if (error?.name === 'MongooseServerSelectionError') {
      if (isAtlas) {
        logger.error(`Could not connect to MongoDB Atlas cluster at ${env.MONGO_URI}`);
        logger.error(`Reason: Your IP address is not whitelisted in MongoDB Atlas Network Access.`);
        logger.error(`Action required:`);
        logger.error(`1. Go to cloud.mongodb.com -> Security -> Network Access`);
        logger.error(`2. Click "ADD IP ADDRESS" -> "ALLOW ACCESS FROM ANYWHERE" (0.0.0.0/0) or add your current IP.`);
      } else {
        logger.error(`Could not connect to local MongoDB at ${env.MONGO_URI}.`);
        logger.error(`Fix: Start MongoDB service in Windows services.msc or run 'net start MongoDB' in an Administrator terminal.`);
      }
    } else {
      logger.error('Failed to connect to MongoDB:', error);
    }
    process.exit(1);
  }
};
