import { z } from 'zod';

/**
 * Strips dangerous HTML tags, inline event handlers, and script executions from a string.
 */
export const sanitizeString = (input: string): string => {
	if (typeof input !== 'string') return input;

	return input
		// Strip null bytes
		.replace(/\0/g, '')
		// Strip script tags and content within
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
		// Strip iframe, embed, object tags
		.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
		.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
		.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
		// Strip inline on* event handlers
		.replace(/\bon\w+\s*=\s*(['"]).*?\1/gi, '')
		.replace(/\bon\w+\s*=\s*[^\s>]+/gi, '')
		// Strip javascript: / vbscript: pseudo protocols
		.replace(/(javascript|vbscript|data):/gi, '$1_disarmed:')
		// Trim whitespace
		.trim();
};

/**
 * Recursively sanitizes an object, preventing Prototype Pollution and stripping harmful HTML.
 */
export const sanitizeObject = <T>(data: T): T => {
	if (data === null || data === undefined) {
		return data;
	}

	if (typeof data === 'string') {
		return sanitizeString(data) as unknown as T;
	}

	if (Array.isArray(data)) {
		return data.map((item) => sanitizeObject(item)) as unknown as T;
	}

	if (typeof data === 'object') {
		const sanitized: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
			// Prevent prototype pollution attacks
			if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
				continue;
			}
			const sanitizedKey = sanitizeString(key);
			sanitized[sanitizedKey] = sanitizeObject(value);
		}
		return sanitized as T;
	}

	return data;
};

/**
 * Reusable Zod helper for sanitized, trimmed strings
 */
export const sanitizedString = (minLength = 1, maxLength?: number) => {
	const base = z.string().trim().transform((val) => sanitizeString(val));
	let stringValidator = z.string().min(minLength);
	if (maxLength !== undefined) {
		stringValidator = stringValidator.max(maxLength);
	}
	return base.pipe(stringValidator);
};
