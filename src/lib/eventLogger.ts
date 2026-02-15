// Immutable Event Logger
// Records all significant actions for audit trail with SHA-256 hash chain

import CryptoJS from 'crypto-js';

export type EventType =
    | 'filing_created' | 'filing_submitted' | 'filing_paid' | 'filing_reconciled'
    | 'payment_made' | 'payment_linked'
    | 'wht_certificate_uploaded' | 'wht_credit_applied'
    | 'invoice_created' | 'invoice_paid'
    | 'document_uploaded' | 'document_deleted'
    | 'calculation_performed'
    | 'export_generated'
    | 'login' | 'logout'
    | 'settings_changed'
    | 'anomaly_detected' | 'anomaly_resolved';

export interface EventLogEntry {
    id: string;
    event_type: EventType;
    user_id: string;
    entity_type?: string;
    entity_id?: string;
    action: string;
    details?: Record<string, unknown>;
    ip_address?: string;
    timestamp: string;
    hash: string;
    previous_hash: string;
}

// In-memory log + localStorage persistence
let eventLog: EventLogEntry[] = [];
let lastHash = '0000000000000000000000000000000000000000000000000000000000000000';

function initialize() {
    try {
        const stored = localStorage.getItem('buoyance_event_log');
        if (stored) {
            eventLog = JSON.parse(stored);
            if (eventLog.length > 0) {
                lastHash = eventLog[eventLog.length - 1].hash;
            }
        }
    } catch { /* fresh start */ }
}

initialize();

function computeHash(entry: Omit<EventLogEntry, 'hash'>): string {
    const data = JSON.stringify({
        id: entry.id,
        event_type: entry.event_type,
        user_id: entry.user_id,
        action: entry.action,
        timestamp: entry.timestamp,
        previous_hash: entry.previous_hash,
    });
    return CryptoJS.SHA256(data).toString();
}

export function logEvent(
    eventType: EventType,
    userId: string,
    action: string,
    options?: {
        entity_type?: string;
        entity_id?: string;
        details?: Record<string, unknown>;
    }
): EventLogEntry {
    const entry: Omit<EventLogEntry, 'hash'> = {
        id: crypto.randomUUID(),
        event_type: eventType,
        user_id: userId,
        entity_type: options?.entity_type,
        entity_id: options?.entity_id,
        action,
        details: options?.details,
        timestamp: new Date().toISOString(),
        previous_hash: lastHash,
    };

    const hash = computeHash(entry);
    const fullEntry: EventLogEntry = { ...entry, hash };

    eventLog.push(fullEntry);
    lastHash = hash;

    // Persist
    try {
        localStorage.setItem('buoyance_event_log', JSON.stringify(eventLog));
    } catch { /* storage full, trim old entries */ }

    return fullEntry;
}

export function getEventLog(userId: string, limit: number = 50): EventLogEntry[] {
    return eventLog
        .filter(e => e.user_id === userId)
        .slice(-limit)
        .reverse();
}

export function getEventsByEntity(entityType: string, entityId: string): EventLogEntry[] {
    return eventLog
        .filter(e => e.entity_type === entityType && e.entity_id === entityId)
        .reverse();
}

export function verifyLogIntegrity(): { valid: boolean; broken_at?: number } {
    for (let i = 1; i < eventLog.length; i++) {
        if (eventLog[i].previous_hash !== eventLog[i - 1].hash) {
            return { valid: false, broken_at: i };
        }
        // Verify hash
        const { hash, ...rest } = eventLog[i];
        const computed = computeHash(rest);
        if (computed !== hash) {
            return { valid: false, broken_at: i };
        }
    }
    return { valid: true };
}

export function exportAuditLog(userId: string): string {
    const entries = getEventLog(userId, 1000);
    const csv = [
        'Timestamp,Event Type,Action,Entity Type,Entity ID,Hash',
        ...entries.map(e =>
            `"${e.timestamp}","${e.event_type}","${e.action}","${e.entity_type || ''}","${e.entity_id || ''}","${e.hash}"`
        ),
    ].join('\n');
    return csv;
}

export function getEventTypeLabel(type: EventType): string {
    const labels: Record<EventType, string> = {
        filing_created: 'Filing Created',
        filing_submitted: 'Filing Submitted',
        filing_paid: 'Filing Paid',
        filing_reconciled: 'Filing Reconciled',
        payment_made: 'Payment Made',
        payment_linked: 'Payment Linked',
        wht_certificate_uploaded: 'WHT Certificate Uploaded',
        wht_credit_applied: 'WHT Credit Applied',
        invoice_created: 'Invoice Created',
        invoice_paid: 'Invoice Paid',
        document_uploaded: 'Document Uploaded',
        document_deleted: 'Document Deleted',
        calculation_performed: 'Calculation Performed',
        export_generated: 'Export Generated',
        login: 'Login',
        logout: 'Logout',
        settings_changed: 'Settings Changed',
        anomaly_detected: 'Anomaly Detected',
        anomaly_resolved: 'Anomaly Resolved',
    };
    return labels[type] || type;
}

export function getEventTypeIcon(type: EventType): string {
    const icons: Record<EventType, string> = {
        filing_created: '📝',
        filing_submitted: '📤',
        filing_paid: '💳',
        filing_reconciled: '✅',
        payment_made: '💰',
        payment_linked: '🔗',
        wht_certificate_uploaded: '📄',
        wht_credit_applied: '💎',
        invoice_created: '🧾',
        invoice_paid: '✅',
        document_uploaded: '📎',
        document_deleted: '🗑️',
        calculation_performed: '🧮',
        export_generated: '📊',
        login: '🔐',
        logout: '🚪',
        settings_changed: '⚙️',
        anomaly_detected: '⚠️',
        anomaly_resolved: '✅',
    };
    return icons[type] || '📋';
}
