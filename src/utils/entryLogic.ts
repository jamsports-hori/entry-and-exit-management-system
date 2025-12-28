export type UserStatus = 'entered' | 'exited' | 'unknown';

export interface EntryRecord {
    email: string;
    lastAction: 'entry' | 'exit';
    lastActionTime: number; // timestamp
}

const STORAGE_KEY = 'mountain_pass_records';

export const getStatus = (email: string): UserStatus => {
    if (typeof window === 'undefined') return 'unknown';

    const records = getRecords();
    const record = records[email];

    if (!record) return 'unknown';
    return record.lastAction === 'entry' ? 'entered' : 'exited';
};

export const recordAction = (email: string): { status: UserStatus, timestamp: string } => {
    const records = getRecords();
    const currentStatus = records[email]?.lastAction || 'exit'; // Default to exit if new (so first action is entry)

    // Toggle logic: If currently entered, then exit. If exited/unknown, then enter.
    // Exception: If unknown (new user), we assume 'entry'.

    let newAction: 'entry' | 'exit' = 'entry';
    if (currentStatus === 'entry') {
        newAction = 'exit';
    }

    const now = Date.now();
    records[email] = {
        email,
        lastAction: newAction,
        lastActionTime: now
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));

    return {
        status: newAction === 'entry' ? 'entered' : 'exited',
        timestamp: new Date(now).toLocaleString('ja-JP')
    };
};

const getRecords = (): Record<string, EntryRecord> => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
};
