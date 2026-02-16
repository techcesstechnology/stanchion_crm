import { Timestamp } from "../types";

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
    field: string;
    direction: SortDirection;
}

export const sortData = <T>(
    data: T[],
    config: SortConfig
): T[] => {
    if (!config.field) return data;

    return [...data].sort((a, b) => {
        let valueA = (a as any)[config.field];
        let valueB = (b as any)[config.field];

        // Handle Firebase Timestamp or Date objects
        const normalizeDate = (val: unknown) => {
            if (val && typeof val === 'object' && 'seconds' in val) {
                return (val as Timestamp).seconds * 1000;
            }
            if (val instanceof Date) {
                return val.getTime();
            }
            if (typeof val === 'string' && !isNaN(Date.parse(val))) {
                return new Date(val).getTime();
            }
            return val;
        };

        if (config.field === 'date' || config.field === 'createdAt' || config.field === 'expiryDate' || config.field === 'dueDate') {
            valueA = normalizeDate(valueA);
            valueB = normalizeDate(valueB);
        }

        // Handle strings (case-insensitive)
        if (typeof valueA === 'string' && typeof valueB === 'string') {
            const comparison = valueA.localeCompare(valueB);
            return config.direction === 'asc' ? comparison : -comparison;
        }

        // Handle numbers and normalized dates
        const aVal = valueA as number | string;
        const bVal = valueB as number | string;

        if (aVal < bVal) return config.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return config.direction === 'asc' ? 1 : -1;
        return 0;
    });
};
