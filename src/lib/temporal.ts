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
	if (value instanceof Date) {
		return Temporal.Instant.fromEpochMilliseconds(value.getTime());
	}
	if (typeof value === 'number') {
		return Temporal.Instant.fromEpochMilliseconds(value);
	}
	if (typeof value === 'string') {
		return Temporal.Instant.from(value);
	}
	return undefined;
}
