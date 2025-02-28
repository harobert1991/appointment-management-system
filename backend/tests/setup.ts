// Test setup configuration
export {};
import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import crypto from 'crypto';

// Generate a test encryption key if not provided
process.env.TOKEN_ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || 
  crypto.randomBytes(32).toString('base64');

dotenv.config({ path: '.env.test' });

let mongod: MongoMemoryServer;

// Mock MongoDB connection
beforeAll(async () => {
  try {
    // Initialize MongoDB Memory Server
    mongod = await MongoMemoryServer.create();
    const mongoUri = mongod.getUri();

    console.log('MongoDB Memory Server created:', mongoUri);

    // Mock mongoose methods but still allow actual connection for in-memory database
    await mongoose.connect(mongoUri);
    
    // Mock connection event handlers
    jest.spyOn(mongoose.connection, 'on').mockImplementation(() => mongoose.connection);
    jest.spyOn(mongoose.connection, 'once').mockImplementation(() => mongoose.connection);

    // Mock declarations must come before imports
    jest.mock('../src/utils/logger', () => ({
      info: jest.fn(),
      error: jest.fn()
    }));
  } catch (error) {
    console.error('Failed to start MongoDB Memory Server:', error);
    throw error;
  }
});

// Clean up after all tests
afterAll(async () => {
  try {
    // Clean up mocks
    jest.restoreAllMocks();
    
    // Cleanup MongoDB
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongod) {
      await mongod.stop();
    }
  } catch (error) {
    console.error('Failed to cleanup test environment:', error);
    throw error;
  }
}); 