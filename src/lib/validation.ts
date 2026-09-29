/**
 * Server-Side Validation & Sanitization Engine
 */

export interface ValidationResult<T> {
  valid: boolean;
  value?: T;
  error?: string;
}

/**
 * Validates password strength:
 * - At least 8 characters
 * - At most 128 characters (prevents bcrypt denial-of-service)
 * - Contains at least one uppercase letter
 * - Contains at least one lowercase letter
 * - Contains at least one digit or special character
 */
export function validatePasswordStrength(password: unknown): ValidationResult<string> {
  if (typeof password !== 'string') {
    return { valid: false, error: 'Password must be a string.' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password cannot exceed 128 characters.' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter.' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter.' };
  }

  if (!/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number or special character.' };
  }

  return { valid: true, value: password };
}

/**
 * Validates email address format and length.
 */
export function validateEmail(email: unknown): ValidationResult<string> {
  if (typeof email !== 'string') {
    return { valid: false, error: 'Email must be a string.' };
  }

  const clean = email.trim().toLowerCase();
  if (clean.length < 5 || clean.length > 254) {
    return { valid: false, error: 'Email must be between 5 and 254 characters.' };
  }

  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(clean)) {
    return { valid: false, error: 'Please provide a valid email address.' };
  }

  return { valid: true, value: clean };
}

/**
 * Validates integer quantity (e.g. cart quantity, stock level).
 */
export function validateQuantity(
  quantity: unknown,
  min: number = 1,
  max: number = 99
): ValidationResult<number> {
  const num = Number(quantity);
  if (!Number.isInteger(num) || isNaN(num) || !isFinite(num) || num < min || num > max) {
    return {
      valid: false,
      value: min,
      error: `Quantity must be an integer between ${min} and ${max}.`,
    };
  }
  return { valid: true, value: num };
}

/**
 * Validates inventory count (must be non-negative integer, up to 1,000,000).
 */
export function validateInventoryCount(
  inventory: unknown,
  max: number = 1_000_000
): ValidationResult<number> {
  const num = Number(inventory);
  if (!Number.isInteger(num) || isNaN(num) || !isFinite(num) || num < 0 || num > max) {
    return {
      valid: false,
      value: 0,
      error: `Inventory must be a whole number between 0 and ${max}.`,
    };
  }
  return { valid: true, value: num };
}

/**
 * Validates a monetary amount (e.g. price, cost, subtotal).
 */
export function validatePrice(
  amount: unknown,
  min: number = 0,
  max: number = 1_000_000
): ValidationResult<number> {
  const num = Number(amount);
  if (isNaN(num) || !isFinite(num) || num < min || num > max) {
    return {
      valid: false,
      value: min,
      error: `Amount must be a number between ${min} and ${max}.`,
    };
  }
  return { valid: true, value: Math.round(num * 100) / 100 };
}

/**
 * Validates a discount percentage (0 - 100%).
 */
export function validatePercentage(
  percent: unknown,
  min: number = 0,
  max: number = 100
): ValidationResult<number> {
  const num = Number(percent);
  if (isNaN(num) || !isFinite(num) || num < min || num > max) {
    return {
      valid: false,
      value: min,
      error: `Percentage must be between ${min}% and ${max}%.`,
    };
  }
  return { valid: true, value: Math.round(num * 100) / 100 };
}

/**
 * Validates entity identifiers (e.g. CUID, UUID, slug) to prevent injection or directory traversal.
 */
export function validateId(id: unknown, fieldName: string = 'ID'): ValidationResult<string> {
  if (typeof id !== 'string') {
    return { valid: false, error: `${fieldName} is required.` };
  }

  const clean = id.trim();
  if (clean.length < 1 || clean.length > 128) {
    return { valid: false, error: `${fieldName} must be between 1 and 128 characters.` };
  }

  // Permitted characters: alphanumeric, dashes, underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(clean)) {
    return { valid: false, error: `${fieldName} contains invalid characters.` };
  }

  return { valid: true, value: clean };
}

/**
 * Sanitizes plain text input by trimming and escaping raw HTML characters
 * to prevent Stored / Reflected Cross-Site Scripting (XSS).
 */
export function sanitizeString(value: unknown, maxLength: number = 500): string {
  if (value === null || value === undefined) return '';
  const str = String(value).trim().slice(0, maxLength);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Validates postal / ZIP code format.
 */
export function validatePostalCode(postalCode: unknown): ValidationResult<string> {
  if (typeof postalCode !== 'string') {
    return { valid: false, error: 'Postal code must be a string.' };
  }
  const clean = postalCode.trim();
  if (!/^[a-zA-Z0-9\s-]{3,10}$/.test(clean)) {
    return { valid: false, error: 'Please enter a valid postal code.' };
  }
  return { valid: true, value: clean };
}
