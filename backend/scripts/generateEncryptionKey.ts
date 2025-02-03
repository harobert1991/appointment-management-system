import crypto from 'crypto';

// Generate a 32-byte (256-bit) random key and encode it as base64
const key = crypto.randomBytes(32).toString('base64');
console.log('TOKEN_ENCRYPTION_KEY=' + key); 