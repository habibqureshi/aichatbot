import { ENV } from '@/app/utils/env';

const ALGORITHM = 'AES-GCM';
// Ensure key is exactly 32 bytes by using SHA-256
async function getKey(): Promise<CryptoKey> {
    const textEncoder = new TextEncoder();
    const keyMaterial = textEncoder.encode(ENV.COOKIE_ENCRYPTION_KEY || 'default-key-32-bytes-long!!');

    // Hash the key material to ensure exact length
    const hashBuffer = await crypto.subtle.digest('SHA-256', keyMaterial);

    // Import the key
    return crypto.subtle.importKey(
        'raw',
        hashBuffer,
        ALGORITHM,
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypts data using AES-GCM
 * @param data - String to encrypt
 * @returns Format: iv:encryptedData
 */
export async function encrypt(data: string): Promise<string> {
    console.log('encrypt', data)
    // Convert string to Uint8Array
    const textEncoder = new TextEncoder();
    const dataBuffer = textEncoder.encode(data);

    // Generate a random 12-byte initialization vector
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Get the encryption key
    const key = await getKey();

    // Encrypt the data
    const encryptedBuffer = await crypto.subtle.encrypt(
        {
            name: ALGORITHM,
            iv: iv
        },
        key,
        dataBuffer
    );

    // Convert encrypted data to hex
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const encryptedHex = Array.from(encryptedArray)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    // Convert IV to hex
    const ivHex = Array.from(iv)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    // Combine components: iv:encryptedData
    const encrypted = `${ivHex}:${encryptedHex}`;
    console.log('encrypted', encrypted)
    return encrypted;
}

/**
 * Decrypts data that was encrypted using encrypt()
 * @param encryptedData - Format: iv:encryptedData
 * @returns Decrypted string or null if decryption fails
 */
export async function decrypt(encryptedData: string): Promise<string | null> {
    try {
        // Split the encrypted data into components
        const [ivHex, encryptedHex] = encryptedData.split(':');

        if (!ivHex || !encryptedHex) {
            return null;
        }

        // Convert hex strings back to Uint8Arrays
        const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
        const encryptedArray = new Uint8Array(encryptedHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

        // Get the encryption key
        const key = await getKey();

        // Decrypt the data
        const decryptedBuffer = await crypto.subtle.decrypt(
            {
                name: ALGORITHM,
                iv: iv
            },
            key,
            encryptedArray
        );

        // Convert decrypted data to string
        const textDecoder = new TextDecoder();
        return textDecoder.decode(decryptedBuffer);
    } catch (error) {
        console.error('Decryption failed:', error);
        return null;
    }
}