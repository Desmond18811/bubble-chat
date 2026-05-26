import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'bubble-encrypt-db';
const STORE_NAME = 'keys';
const PRIVATE_KEY_ID = 'bubble_sk';

interface BubbleDB {
    keys: {
        key: string;
        value: string;
    };
}

let dbPromise: Promise<IDBPDatabase<BubbleDB>> | null = null;

const getDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<BubbleDB>(DB_NAME, 1, {
            upgrade(db) {
                db.createObjectStore(STORE_NAME);
            },
        });
    }
    return dbPromise;
};

/**
 * Stores the private key securely in IndexedDB.
 */
export const storePrivateKey = async (secretKey: string): Promise<void> => {
    const db = await getDB();
    await db.put(STORE_NAME, secretKey, PRIVATE_KEY_ID);
};

/**
 * Retrieves the private key from IndexedDB.
 */
export const getPrivateKey = async (): Promise<string | undefined> => {
    const db = await getDB();
    return db.get(STORE_NAME, PRIVATE_KEY_ID);
};

/**
 * Removes the private key (e.g. on logout).
 */
export const clearPrivateKey = async (): Promise<void> => {
    const db = await getDB();
    await db.delete(STORE_NAME, PRIVATE_KEY_ID);
};

/**
 * Exports the private key as a downloadable blob.
 */
export const exportKeyBackup = async (): Promise<Blob | null> => {
    const sk = await getPrivateKey();
    if (!sk) return null;
    return new Blob([sk], { type: 'text/plain' });
};

/**
 * Imports a private key from a backup string.
 */
export const importKeyBackup = async (backupStr: string): Promise<void> => {
    if (!backupStr || backupStr.length < 32) {
        throw new Error('Invalid backup key format.');
    }
    await storePrivateKey(backupStr);
};
