import process from 'node:process';

export const getEnv = (key: string, defaultValue?: string): string => {
	const value = process.env[key];
	if (value === undefined || value === '') {
		if (defaultValue !== undefined) {
			return defaultValue;
		}
		throw new Error(`Environment variable "${key}" is required but not set.`);
	}
	return value;
};

export const getEnvNumber = (key: string, defaultValue?: number): number => {
	const value = process.env[key];
	if (value === undefined || value === '') {
		if (defaultValue !== undefined) {
			return defaultValue;
		}
		throw new Error(`Environment variable "${key}" is required but not set.`);
	}
	const parsed = Number(value);
	if (Number.isNaN(parsed)) {
		throw new Error(
			`Environment variable "${key}" must be a number, received "${value}".`,
		);
	}
	return parsed;
};

export const getEnvBoolean = (key: string, defaultValue = false): boolean => {
	const value = process.env[key];
	if (value === undefined || value === '') {
		return defaultValue;
	}
	return value.toLowerCase() === 'true' || value === '1';
};
