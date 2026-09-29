export type SecurityEventType =
  | 'FAILED_LOGIN'
  | 'SUSPICIOUS_AUTH'
  | 'AUTHZ_FAILURE'
  | 'ADMIN_ACTION'
  | 'PAYMENT_EVENT'
  | 'WEBHOOK_FAILURE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INPUT_VALIDATION_ERROR';

export type SecurityLogLevel = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface SecurityEventData {
  type: SecurityEventType;
  level?: SecurityLogLevel;
  action: string;
  ip?: string;
  userId?: string | null;
  userEmail?: string | null;
  resourceId?: string | null;
  details?: Record<string, any>;
  error?: string | null;
}

const REDACTED_KEYS = new Set([
  'password',
  'passwordhash',
  'currentpassword',
  'newpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'sessiontoken',
  'secret',
  'jwtsecret',
  'stripesecretkey',
  'stripewebhooksecret',
  'authorization',
  'cookie',
  'card',
  'creditcard',
  'cardnumber',
  'cvv',
  'cvc',
  'pan',
  'apikey',
  'resendapikey',
]);

/**
 * Recursively sanitizes objects to prevent any passwords, secret keys,
 * authentication tokens, or full payment credentials from being written to logs.
 */
export function sanitizeLogData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    // Redact Bearer tokens if present in strings
    if (data.toLowerCase().startsWith('bearer ')) {
      return 'Bearer [REDACTED]';
    }
    // Redact Stripe secret keys if leaked in strings
    if (data.startsWith('sk_live_') || data.startsWith('sk_test_') || data.startsWith('whsec_')) {
      return '[REDACTED_STRIPE_KEY]';
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item));
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase().replace(/[^a-z]/g, '');
      if (REDACTED_KEYS.has(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeLogData(value);
      } else if (typeof value === 'string') {
        sanitized[key] = sanitizeLogData(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Standard server-side security logger.
 * Formats events in structured JSON for cloud log aggregators.
 */
export function logSecurityEvent(event: SecurityEventData): void;
export function logSecurityEvent(
  type: SecurityEventType | string,
  details?: any,
  request?: any,
  user?: any
): void;
export function logSecurityEvent(
  eventOrType: SecurityEventData | SecurityEventType | string,
  detailsOrUndefined?: any,
  requestOrUndefined?: any,
  userOrUndefined?: any
): void {
  let event: SecurityEventData;

  if (typeof eventOrType === 'string') {
    const details = detailsOrUndefined || {};
    let ip = 'unknown';
    if (requestOrUndefined) {
      if (typeof requestOrUndefined.ip === 'string') {
        ip = requestOrUndefined.ip;
      } else if (typeof requestOrUndefined.headers?.get === 'function') {
        ip = requestOrUndefined.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
      }
    }
    const userId = userOrUndefined?.userId || details?.userId || undefined;
    const userEmail = userOrUndefined?.email || details?.email || undefined;
    const action = details?.action || details?.reason || eventOrType;
    const isErrorOrWarn =
      eventOrType.includes('FAIL') ||
      eventOrType.includes('ERROR') ||
      eventOrType.includes('BLOCKED') ||
      (typeof details?.reason === 'string' && (details.reason.includes('FAIL') || details.reason.includes('INVALID')));

    event = {
      type: eventOrType as SecurityEventType,
      level: isErrorOrWarn ? 'WARN' : 'INFO',
      action,
      ip,
      userId,
      userEmail,
      details,
      error: details?.error || details?.message,
    };
  } else {
    event = eventOrType;
  }

  const timestamp = new Date().toISOString();
  const level: SecurityLogLevel = event.level || 'INFO';

  const entry = {
    timestamp,
    level,
    securityEventType: event.type,
    action: event.action,
    ip: event.ip || 'unknown',
    userId: event.userId || undefined,
    userEmail: event.userEmail ? sanitizeEmail(event.userEmail) : undefined,
    resourceId: event.resourceId || undefined,
    details: event.details ? sanitizeLogData(event.details) : undefined,
    error: event.error ? String(event.error).slice(0, 500) : undefined,
  };

  const output = JSON.stringify(entry);

  switch (level) {
    case 'CRITICAL':
    case 'ERROR':
      console.error(`[SECURITY ${level}] ${output}`);
      break;
    case 'WARN':
      console.warn(`[SECURITY WARN] ${output}`);
      break;
    case 'INFO':
    default:
      console.info(`[SECURITY INFO] ${output}`);
      break;
  }
}

/**
 * Masks user email addresses for privacy in access logs, preserving domain for investigation
 * Example: j***e@example.com
 */
function sanitizeEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return '[INVALID_EMAIL]';
  const name = parts[0];
  const domain = parts[1];
  if (name.length <= 2) {
    return `${name[0]}*@${domain}`;
  }
  return `${name[0]}${'*'.repeat(Math.min(name.length - 2, 5))}${name[name.length - 1]}@${domain}`;
}
