import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const HOLIDAYS_FILE = process.env.HOLIDAYS_FILE_PATH!;
const dir = dirname(HOLIDAYS_FILE);
if (!existsSync(dir)) {
    console.log("Data folder does not exist, creating...");
    mkdirSync(dir, { recursive: true });

    console.log("Holidays file does not exist, creating...");
    writeFileSync(HOLIDAYS_FILE, '[]', 'utf-8');
}

export function getHolidaysList(): string[] {
    if (!existsSync(HOLIDAYS_FILE)) {
        return [];
    }

    return JSON.parse(readFileSync(HOLIDAYS_FILE, 'utf-8'));
}

export function setHolidaysList(list: string[]) {
    writeFileSync(HOLIDAYS_FILE, JSON.stringify(list, null, 2), 'utf-8');
}