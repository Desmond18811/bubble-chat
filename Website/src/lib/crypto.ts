/**
 * Simple WebCrypto wrapper for ECDH + AES-GCM End-To-End Encryption
 */

// Generate a local ECDH keypair
export async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
  return keyPair;
}

// Export public key to base64
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('spki', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

// Export private key to base64 (for local storage only!)
export async function exportPrivateKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('pkcs8', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

// Import public key from base64
export async function importPublicKey(base64: string): Promise<CryptoKey> {
  const binaryDer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  return await window.crypto.subtle.importKey(
    'spki',
    binaryDer,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );
}

// Import private key from base64
export async function importPrivateKey(base64: string): Promise<CryptoKey> {
  const binaryDer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  return await window.crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
}

// Derive shared AES-GCM secret
export async function deriveSecretKey(privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> {
  return await window.crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt text string
export async function encryptText(text: string, secretKey: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    secretKey,
    enc.encode(text)
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...new Uint8Array(iv))),
  };
}

// Decrypt text string
export async function decryptText(ciphertext: string, ivBase64: string, secretKey: CryptoKey): Promise<string> {
  try {
    const dec = new TextDecoder();
    const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
    const data = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      secretKey,
      data
    );
    return dec.decode(decrypted);
  } catch (e) {
    throw new Error('Decryption failed');
  }
} 