import crypto from 'crypto';
import base32 from 'hi-base32';
import qrcode from 'qrcode';

/**
 * Generates TOTP secret and QR code
 * @param {string} userEmail - User's email for QR code label
 * @returns {Object} Object containing secret and QR code data URL
 */
export const generateTOTP = async (userEmail) => {
  // Generate random secret
  const secret = crypto.randomBytes(20);
  // Convert to base32 for compatibility with authenticator apps
  const base32Secret = base32.encode(secret).replace(/=/g, '');

  // Create otpauth URL for QR code
  const appName = process.env.APP_NAME || 'FLB61';
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(userEmail)}?secret=${base32Secret}&issuer=${encodeURIComponent(appName)}`;

  // Generate QR code
  const qrCode = await qrcode.toDataURL(otpauthUrl);

  return {
    secret: base32Secret,
    qrCode
  };
};

/**
 * Validates a TOTP token
 * @param {string} token - The token to validate
 * @param {string} secret - Base32 encoded secret
 * @param {number} window - Time window for validation (default ±1 step)
 * @returns {boolean} True if token is valid
 */
export const verifyTOTP = (token, secret, window = 1) => {
  if (!token || !secret) {
    return false;
  }

  // Decode base32 secret
  const decodedSecret = base32.decode.asBytes(secret);

  // Get current time step (30 seconds)
  const timeStep = 30;
  const now = Math.floor(Date.now() / 1000);
  const currentStep = Math.floor(now / timeStep);

  // Check tokens within time window
  for (let i = -window; i <= window; i++) {
    const expectedToken = generateToken(decodedSecret, currentStep + i);
    if (expectedToken === token) {
      return true;
    }
  }

  return false;
};

/**
 * Generates a TOTP token for a specific time step
 * @param {Buffer} secret - Decoded secret
 * @param {number} timeStep - Current time step
 * @returns {string} 6-digit TOTP token
 */
function generateToken(secret, timeStep) {
  // Convert time step to buffer
  const timeBuffer = Buffer.alloc(8);
  for (let i = 0; i < 8; i++) {
    timeBuffer[7 - i] = timeStep & 0xff;
    timeStep = timeStep >> 8;
  }

  // Generate HMAC
  const hmac = crypto.createHmac('sha1', Buffer.from(secret));
  hmac.update(timeBuffer);
  const hmacResult = hmac.digest();

  // Get offset
  const offset = hmacResult[hmacResult.length - 1] & 0xf;

  // Generate 4-byte code
  const code = (hmacResult[offset] & 0x7f) << 24 |
    (hmacResult[offset + 1] & 0xff) << 16 |
    (hmacResult[offset + 2] & 0xff) << 8 |
    (hmacResult[offset + 3] & 0xff);

  // Convert to 6-digit string
  const token = (code % 1000000).toString().padStart(6, '0');
  return token;
}
