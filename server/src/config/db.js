import mongoose from 'mongoose';
import { env } from './env.js';

function getMongoHost(uri) {
  try {
    return new URL(uri).hostname;
  } catch {
    return '';
  }
}

function validateMongoUri(uri) {
  const host = getMongoHost(uri);

  if (!uri) {
    throw new Error('MONGODB_URI is required in server/.env');
  }

  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    throw new Error('MONGODB_URI must start with mongodb:// or mongodb+srv://');
  }

  if (host === 'cluster.mongodb.net') {
    throw new Error(
      'MONGODB_URI is still using the placeholder host cluster.mongodb.net. Use the full Atlas host, for example cluster0.abcd123.mongodb.net.'
    );
  }
}

export async function connectDb() {
  validateMongoUri(env.mongoUri);

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(env.mongoUri);
  } catch (error) {
    const host = getMongoHost(env.mongoUri);

    if (error.message.includes('querySrv ENOTFOUND')) {
      throw new Error(
        `Could not resolve MongoDB Atlas host "${host}". Copy the exact connection string from Atlas, including the cluster-specific hostname.`
      );
    }

    throw error;
  }
}
