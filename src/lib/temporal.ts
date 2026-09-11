import 'temporal-polyfill/full/global';
import { Temporal } from 'temporal-polyfill';

export { Temporal };

/**
 * Returns the current time as a Temporal.Instant.
 * Compatible with Prisma 8's pg/timestamptz-temporal@1 codec.
 */
export const nowInstant = (): Temporal.Instant => {
	return Temporal.Now.instant();
};

/**
 * Converts a Date, ISO string, epoch millisecond timestamp, or Temporal.Instant
 * into a valid Temporal.Instant for Prisma 8 queries and mutations.
 */
export function toInstant(
	value: Date | number | string | Temporal.Instant,
): Temporal.Instant;
export function toInstant(
	value?: Date | string | number | Temporal.Instant | null,
): Temporal.Instant | undefined;
export function toInstant(
	value?: Date | string | number | Temporal.Instant | null,
): Temporal.Instant | undefined {
	if (!value) return undefined;
	if (value instanceof Temporal.Instant) return value;
	if (
		typeof value === 'object' &&
		(value.constructor?.name === 'Instant' ||
			(value as any)[Symbol.toStringTag] === 'Temporal.Instant')
	) {
		return value as Temporal.Instant;
	}
	if (value instanceof Date) {
		return Temporal.Instant.fromEpochMilliseconds(value.getTime());
	}
	if (typeof value === 'number') {
		return Temporal.Instant.fromEpochMilliseconds(value);
	}
	if (typeof value === 'string') {
		return Temporal.Instant.from(value);
	}
	if (typeof (value as any).toString === 'function') {
		try {
			const str = (value as any).toString();
			if (str && str !== '[object Object]') {
				return Temporal.Instant.from(str);
			}
		} catch {
			// fall through
		}
	}
	return undefined;
}

/**
 * Converts a Date, Temporal.Instant, epoch milliseconds, or ISO string into a standard JavaScript Date.
 * Prevents TypeError: Cannot use valueOf when converting TC39 Temporal.Instant instances.
 */
export function toDate(
	value?: Date | string | number | Temporal.Instant | null,
): Date {
	if (!value) return new Date();
	if (value instanceof Date) return value;
	if (
		value instanceof Temporal.Instant ||
		typeof (value as any)?.epochMilliseconds === 'number'
	) {
		return new Date((value as any).epochMilliseconds);
	}
	if (typeof value === 'number') return new Date(value);
	if (typeof value === 'string') return new Date(value);
	if (typeof (value as any)?.toString === 'function') {
		try {
			const str = (value as any).toString();
			if (str && str !== '[object Object]') {
				return new Date(str);
			}
		} catch {
			// fall through
		}
	}
	return new Date(String(value));
}
