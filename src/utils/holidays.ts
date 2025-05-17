import { readFileSync, writeFileSync, existsSync } from 'fs';

const HOLIDAYS_FILE = './vacances.json';

export function getHolidaysList(): string[] {
  if (!existsSync(HOLIDAYS_FILE)) return [];
  return JSON.parse(readFileSync(HOLIDAYS_FILE, 'utf-8'));
}

export function setHolidaysList(list: string[]) {
  writeFileSync(HOLIDAYS_FILE, JSON.stringify(list, null, 2), 'utf-8');
}