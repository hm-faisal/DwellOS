import { db } from '../prisma/db.ts';
import { nowInstant, Temporal, toInstant } from './temporal.ts';

export { db, nowInstant, toInstant, Temporal };

function normalizeDates<T>(obj: T): T {
	if (!obj || typeof obj !== 'object') return obj;
	if (obj instanceof Date) {
		return Temporal.Instant.fromEpochMilliseconds(obj.getTime()) as unknown as T;
	}
	if (obj instanceof Temporal.Instant) return obj;
	if (Array.isArray(obj)) {
		return obj.map(normalizeDates) as unknown as T;
	}
	const copy: Record<string, unknown> = {};
	for (const [key, val] of Object.entries(obj)) {
		copy[key] = normalizeDates(val);
	}
	return copy as unknown as T;
}

function wrapFieldProxy(fieldObj: any): any {
	if (!fieldObj || typeof fieldObj !== 'object') return fieldObj;
	return new Proxy(fieldObj, {
		get(target, prop) {
			const orig = target[prop];
			if (typeof orig === 'function') {
				return (...args: any[]) => orig.apply(target, args.map(normalizeDates));
			}
			if (orig && typeof orig === 'object') {
				return wrapFieldProxy(orig);
			}
			return orig;
		},
	});
}

export function wrapOrmClient<T extends object>(target: T): T {
	if (!target || typeof target !== 'object') return target;
	return new Proxy(target, {
		get(modelTarget: any, modelProp: string | symbol) {
			const orig = modelTarget[modelProp];
			if (typeof orig === 'function') {
				return function (...args: any[]) {
					const mappedArgs = args.map((arg) => {
						if (typeof arg === 'function') {
							return (fields: any, fns: any) => {
								const wrappedFields = fields ? wrapFieldProxy(fields) : fields;
								const wrappedFns = fns ? wrapFieldProxy(fns) : fns;
								return arg(wrappedFields, wrappedFns);
							};
						}
						return normalizeDates(arg);
					});
					const res = orig.apply(modelTarget, mappedArgs);
					return res && typeof res === 'object' ? wrapOrmClient(res) : res;
				};
			}
			if (orig && typeof orig === 'object') {
				return wrapOrmClient(orig);
			}
			return orig;
		},
	});
}

/**
 * Returns a typed, Temporal-safe ORM client from db or a transaction tx.
 */
export function getOrmClient(client?: any) {
	const raw = ((client?.orm as any)?.public ?? client?.orm ?? (db.orm as any)?.public ?? db.orm) as any;
	return wrapOrmClient(raw);
}

export const prisma = wrapOrmClient(((db.orm as any).public ?? db.orm) as any);

export interface AuditLogInput {
	actorId?: string | null;
	entityType: string;
	entityId: string;
	action: string;
	beforeState?: unknown;
	afterState?: unknown;
	metadata?: unknown;
}

/**
 * Record an immutable audit log entry.
 * Can be called with either `db` or an active transaction `tx`.
 */
export async function recordAuditLog(
	client: any,
	input: AuditLogInput,
): Promise<void> {
	const ormClient = getOrmClient(client);
	await ormClient.AuditLog.create({
		id: crypto.randomUUID(),
		actorId: input.actorId ?? null,
		entityType: input.entityType,
		entityId: input.entityId,
		action: input.action,
		beforeState: input.beforeState ? JSON.stringify(input.beforeState) : null,
		afterState: input.afterState ? JSON.stringify(input.afterState) : null,
		metadata: input.metadata ? JSON.stringify(input.metadata) : null,
		createdAt: nowInstant(),
	});
}

/**
 * Helper to paginate array results cursor-based
 */
export function paginateResults<T extends { id: string }>(
	items: T[],
	limit: number,
) {
	const hasNextPage = items.length > limit;
	const data = hasNextPage ? items.slice(0, limit) : items;
	const nextCursor = hasNextPage && data.length > 0 ? data[data.length - 1].id : null;

	return {
		items: data,
		nextCursor,
		limit,
	};
}
