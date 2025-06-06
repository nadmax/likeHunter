import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const HOLIDAYS_FILE = process.env.HOLIDAYS_FILE_PATH!;
const dir = dirname(HOLIDAYS_FILE);

if (!existsSync(dir)) {
    console.log("📁 Data folder does not exist, creating...");
    mkdirSync(dir, { recursive: true });
}

if (!existsSync(HOLIDAYS_FILE)) {
    console.log("📄 Holidays file does not exist, creating...");
    writeFileSync(HOLIDAYS_FILE, '[]', 'utf-8');
}

export function getHolidaysList(): string[] {
    if (!existsSync(HOLIDAYS_FILE)) {
        return [];
    }

    try {
        return JSON.parse(readFileSync(HOLIDAYS_FILE, 'utf-8'));
    } catch (err) {
        console.warn('⚠️ Failed to parse holidays file. Resetting.');
        writeFileSync(HOLIDAYS_FILE, '[]', 'utf-8');

        return [];
    }
}

export function setHolidaysList(list: string[]) {
    writeFileSync(HOLIDAYS_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

export function removeUserFromHolidays(userId: string): boolean {
    const current = getHolidaysList();
    const updated = current.filter(id => id !== userId);

    if (current.length !== updated.length) {
        setHolidaysList(updated);

        return true;
    }

    return false;
}