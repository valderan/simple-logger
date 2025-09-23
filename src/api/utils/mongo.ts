import mongoose from 'mongoose';

/**
 * Устанавливает соединение с MongoDB, если оно еще не установлено.
 */
export async function connectMongo(uri: string): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }
  return mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000
  });
}

/**
 * Закрывает соединение с MongoDB.
 */
export async function disconnectMongo(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
