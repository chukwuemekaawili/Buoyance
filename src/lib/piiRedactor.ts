/**
 * PII Redactor Utility
 * 
 * Intercepts objects or strings before they are transmitted to external LLM providers
 * and obfuscates Personal Identifiable Information (PII) to maintain compliance
 * with the Nigeria Data Protection Act (NDPA) 2023.
 */

export class PIIRedactor {
    // Regex patterns for Nigerian specific PII
    private static readonly PATTERNS = {
        // Basic email format
        EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,

        // Nigerian Phone (e.g. 08031234567, +2348031234567)
        NG_PHONE: /(\+234|0)[789][01]\d{8}/g,

        // Nigerian TIN (usually 8-10 digits, sometimes alphanumeric)
        TIN: /\b(?:\d{8}-\d{4}|\d{10}|\d{8}[a-zA-Z]{2})\b/g,

        // Bank Verification Number (BVN) - 11 digits
        BVN: /\b\d{11}\b/g,

        // National Identity Number (NIN) - 11 digits
        NIN: /\b\d{11}\b/g,
    };

    /**
     * Sanitizes a single string passage by replacing regex matches with redaction tags.
     */
    public static sanitizeString(text: string): string {
        if (!text) return text;

        let sanitized = text;
        sanitized = sanitized.replace(this.PATTERNS.EMAIL, '[REDACTED_EMAIL]');
        sanitized = sanitized.replace(this.PATTERNS.NG_PHONE, '[REDACTED_PHONE]');
        sanitized = sanitized.replace(this.PATTERNS.TIN, '[REDACTED_TIN]');
        sanitized = sanitized.replace(this.PATTERNS.BVN, '[REDACTED_ID_11]');
        sanitized = sanitized.replace(this.PATTERNS.NIN, '[REDACTED_ID_11]');

        return sanitized;
    }

    /**
     * Deep sterilizes any generic JSON payload.
     * Useful for purging 'context' objects containing DB rows before AI processing.
     */
    public static sanitizePayload(payload: any): any {
        if (payload === null || payload === undefined) {
            return payload;
        }

        if (typeof payload === 'string') {
            return this.sanitizeString(payload);
        }

        if (Array.isArray(payload)) {
            return payload.map(item => this.sanitizePayload(item));
        }

        if (typeof payload === 'object') {
            const sanitizedObj: Record<string, any> = {};

            for (const [key, value] of Object.entries(payload)) {
                // Drop standard PII column names entirely
                const lowerKey = key.toLowerCase();
                if (
                    lowerKey.includes('name') ||
                    lowerKey.includes('email') ||
                    lowerKey.includes('password') ||
                    lowerKey.includes('token') ||
                    lowerKey.includes('secret')
                ) {
                    sanitizedObj[key] = '[REDACTED_KEY]';
                    continue;
                }

                sanitizedObj[key] = this.sanitizePayload(value);
            }
            return sanitizedObj;
        }

        // Return numbers and booleans as-is
        return payload;
    }
}
