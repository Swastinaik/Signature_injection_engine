import crypto from 'crypto';
export const generateHash = (buffer) => {
    return crypto.createHash('sha256').update(buffer).digest('hex');
};