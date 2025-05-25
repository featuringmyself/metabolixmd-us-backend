const crypto = require('crypto');

/**
 * Utility for encrypting and decrypting sensitive PHI data
 * Implements AES-256-CBC encryption for HIPAA compliance
 */
class Encryption {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    // In production, this key should be loaded from environment variables
    this.key = Buffer.from(process.env.ENCRYPTION_KEY || '2f9ac3a6b4c8d7e5f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8', 'hex');
    this.ivLength = 16;
  }

  encrypt(text) {
    if (!text) return null;
    
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedText) {
    if (!encryptedText) return null;
    
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedData = textParts[1];
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

module.exports = new Encryption();