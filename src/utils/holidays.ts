import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const HOLIDAYS_FILE = './data/vacances.json';
const dir = dirname(HOLIDAYS_FILE);
if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
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