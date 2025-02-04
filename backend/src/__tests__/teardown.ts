import mongoose from 'mongoose';

export default async function globalTeardown() {
  await Promise.all([
    mongoose.disconnect(),
    new Promise(resolve => setTimeout(resolve, 500)) // Give time for connections to close
  ]);
} 