import * as nacl from 'tweetnacl';
import * as util from 'tweetnacl-util';

/**
 * Bubble Chat E2EE Crypto Utilities
 * Uses TweetNaCl for fast, secure public-key authenticated encryption.
 */

// 1. Generate Key Pair on Signup/Login
export const generateKeyPair = () => {
  const keyPair = nacl.box.keyPair();
  const publicKeyStr = util.encodeBase64(keyPair.publicKey);
  const secretKeyStr = util.encodeBase64(keyPair.secretKey);
  
  return { publicKey: publicKeyStr, secretKey: secretKeyStr };
};

// 2. Encrypt Message for a Target User
export const encryptMessage = (
  message: string,
  targetPublicKeyBase64: string,
  mySecretKeyBase64: string
) => {
  const targetPublicKey = util.decodeBase64(targetPublicKeyBase64);
  const mySecretKey = util.decodeBase64(mySecretKeyBase64);

  // Generate a random, one-time use nonce
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageUint8 = util.decodeUTF8(message);

  // Box encryption
  const encryptedBox = nacl.box(messageUint8, nonce, targetPublicKey, mySecretKey);

  // Combine nonce and ciphertext so the recipient can decrypt
  const fullMessage = new Uint8Array(nonce.length + encryptedBox.length);
  fullMessage.set(nonce);
  fullMessage.set(encryptedBox, nonce.length);

  return util.encodeBase64(fullMessage);
};

// 3. Decrypt Message from a Sender
export const decryptMessage = (
  encryptedMessageBase64: string,
  senderPublicKeyBase64: string,
  mySecretKeyBase64: string
) => {
  try {
    const senderPublicKey = util.decodeBase64(senderPublicKeyBase64);
    const mySecretKey = util.decodeBase64(mySecretKeyBase64);
    const fullMessage = util.decodeBase64(encryptedMessageBase64);

    // Extract exactly the same nonce size used during encryption
    const nonce = fullMessage.slice(0, nacl.box.nonceLength);
    const messageContent = fullMessage.slice(nacl.box.nonceLength);

    // Box decryption
    const decryptedUint8 = nacl.box.open(messageContent, nonce, senderPublicKey, mySecretKey);
    
    if (!decryptedUint8) {
      throw new Error('E2EE Decryption Failed (Keys invalid or message altered)');
    }

    return util.encodeUTF8(decryptedUint8);
  } catch (error) {
    console.error('🔓 Decryption Error:', error);
    return '*(Encrypted Transmission)*';
  }
};
