
export type SpecialDuration = import('iso8601-duration').Duration & { recurrences?: number, startDate?: Date | string, endDate?: Date | string };