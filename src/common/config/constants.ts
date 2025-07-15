/**
 * Application-wide constants
 */

// DynamoDB Global Secondary Index names
export const GSI_NAMES = {
  FAMILY_UPDATED_AT: 'family-updatedAt-index'
} as const;

// Table names will be injected via environment variables
export const TABLE_NAMES = {
  MEMO: process.env.MEMO_TABLE_NAME!,
  USER: process.env.USER_TABLE_NAME!,
  INVITE_CODE: process.env.INVITE_CODE_TABLE_NAME!
} as const;

// AWS region
export const AWS_REGION = process.env.AWS_REGION || 'ap-northeast-1';

// Other constants
export const INVITE_CODE_TTL = 300; // 5 minutes in seconds
export const DELETED_MEMO_RETENTION_DAYS = 10; // Days before physical deletion