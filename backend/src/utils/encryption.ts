import crypto from 'crypto';
import { logger } from './logger';

export class Encryption {
  private static algorithm = 'aes-256-gcm';
  private static keyLength = 32;
  private static ivLength = 16;
  private static saltLength = 64;
  private static tagLength = 16;

  private static getKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      password,
      salt,
      100000, // iterations
      this.keyLength,
      'sha256'
    );
  }

  static encrypt(text: string, secretKey: string): string {
    try {
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);
      const key = this.getKey(secretKey, salt);

      const cipher = crypto.createCipheriv(this.algorithm, key, iv) as crypto.CipherGCM;
      const encrypted = Buffer.concat([
        cipher.update(text, 'utf8'),
        cipher.final()
      ]);

      const tag = cipher.getAuthTag();

      // Combine all components: salt + iv + tag + encrypted
      const result = Buffer.concat([salt, iv, tag, encrypted]);
      return result.toString('base64');

    } catch (error) {
      logger.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  static decrypt(encryptedText: string, secretKey: string): string {
    try {
      const buffer = Buffer.from(encryptedText, 'base64');

      // Extract components
      const salt = buffer.subarray(0, this.saltLength);
      const iv = buffer.subarray(this.saltLength, this.saltLength + this.ivLength);
      const tag = buffer.subarray(
        this.saltLength + this.ivLength,
        this.saltLength + this.ivLength + this.tagLength
      );
      const encrypted = buffer.subarray(this.saltLength + this.ivLength + this.tagLength);

      const key = this.getKey(secretKey, salt);

      const decipher = crypto.createDecipheriv(this.algorithm, key, iv) as crypto.DecipherGCM;
      decipher.setAuthTag(tag);

      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);

      return decrypted.toString('utf8');

    } catch (error) {
      logger.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }
} 