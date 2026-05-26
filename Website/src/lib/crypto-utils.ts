import * as nacl from 'tweetnacl';
import * as util from 'tweetnacl-util';
import { getPrivateKey } from './key-storage';

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

/**
 * Encrypts a message for a recipient using their public key and our secret key.
 * Automatically retrieves the secret key from IndexedDB.
 */
export const encryptForRecipient = async (message: string, recipientPublicKeyBase64: string) => {
  const mySecretKeyBase64 = await getPrivateKey();
  if (!mySecretKeyBase64) throw new Error('No identity key found on this device. E2EE encryption failed.');

  const recipientPublicKey = util.decodeBase64(recipientPublicKeyBase64);
  const mySecretKey = util.decodeBase64(mySecretKeyBase64);

  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageUint8 = util.decodeUTF8(message);

  const encryptedBox = nacl.box(messageUint8, nonce, recipientPublicKey, mySecretKey);

  const fullMessage = new Uint8Array(nonce.length + encryptedBox.length);
  fullMessage.set(nonce);
  fullMessage.set(encryptedBox, nonce.length);

  return util.encodeBase64(fullMessage);
};

/**
 * Decrypts a message from a sender using their public key and our secret key.
 * Automatically retrieves the secret key from IndexedDB.
 */
export const decryptFromSender = async (encryptedMessageBase64: string, senderPublicKeyBase64: string) => {
  try {
    const mySecretKeyBase64 = await getPrivateKey();
    if (!mySecretKeyBase64) return '*(Unlock required)*';

    const senderPublicKey = util.decodeBase64(senderPublicKeyBase64);
    const mySecretKey = util.decodeBase64(mySecretKeyBase64);
    const fullMessage = util.decodeBase64(encryptedMessageBase64);

    const nonce = fullMessage.slice(0, nacl.box.nonceLength);
    const messageContent = fullMessage.slice(nacl.box.nonceLength);

    const decryptedUint8 = nacl.box.open(messageContent, nonce, senderPublicKey, mySecretKey);

    if (!decryptedUint8) {
      return '*(Decryption failed)*';
    }

    return util.encodeUTF8(decryptedUint8);
  } catch (error) {
    console.error('🔓 Decryption Error:', error);
    return '*(Encrypted Transmission)*';
  }
};

// Legacy manual functions (keep for compatibility if needed)
export const encryptMessage = (message: string, targetPublicKeyBase64: string, mySecretKeyBase64: string) => {
  const targetPublicKey = util.decodeBase64(targetPublicKeyBase64);
  const mySecretKey = util.decodeBase64(mySecretKeyBase64);
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageUint8 = util.decodeUTF8(message);
  const encryptedBox = nacl.box(messageUint8, nonce, targetPublicKey, mySecretKey);
  const fullMessage = new Uint8Array(nonce.length + encryptedBox.length);
  fullMessage.set(nonce);
  fullMessage.set(encryptedBox, nonce.length);
  return util.encodeBase64(fullMessage);
};

export const decryptMessage = (encryptedMessageBase64: string, senderPublicKeyBase64: string, mySecretKeyBase64: string) => {
  try {
    const senderPublicKey = util.decodeBase64(senderPublicKeyBase64);
    const mySecretKey = util.decodeBase64(mySecretKeyBase64);
    const fullMessage = util.decodeBase64(encryptedMessageBase64);
    const nonce = fullMessage.slice(0, nacl.box.nonceLength);
    const messageContent = fullMessage.slice(nacl.box.nonceLength);
    const decryptedUint8 = nacl.box.open(messageContent, nonce, senderPublicKey, mySecretKey);
    if (!decryptedUint8) throw new Error('E2EE Decryption Failed');
    return util.encodeUTF8(decryptedUint8);
  } catch (error) {
    return '*(Encrypted Transmission)*';
  }
};
