import { Redis } from 'ioredis';
import { envConfig, redisConfig } from '../config/index.ts';

let redisInstance: Redis | null = null;

export const getRedisClient = (): Redis => {
	if (!redisInstance) {
		if (envConfig.redis.url) {
			redisInstance = new Redis(envConfig.redis.url, redisConfig);
		} else {
			redisInstance = new Redis(redisConfig);
		}

		redisInstance.on('connect', () => {
			console.log('[Redis] Connected to Redis server.');
		});

		redisInstance.on('ready', () => {
			console.log('[Redis] Redis client is ready to accept commands.');
		});

		redisInstance.on('error', (err: Error) => {
			console.error('[Redis] Error:', err.message);
		});

		redisInstance.on('close', () => {
			console.warn('[Redis] Redis connection closed.');
		});

		redisInstance.on('reconnecting', (delay: number) => {
			console.log(`[Redis] Reconnecting in ${delay}ms...`);
		});
	}

	return redisInstance;
};

export const redisClient = getRedisClient();

export const connectRedis = async (): Promise<boolean> => {
	try {
		const client = getRedisClient();
		if (client.status === 'wait' || client.status === 'close') {
			await client.connect();
		}
		const pingResult = await client.ping();
		console.log(`[Redis] Ping test successful: ${pingResult}`);
		return true;
	} catch (error) {
		console.error('[Redis] Failed to connect to Redis:', error);
		return false;
	}
};

export const disconnectRedis = async (): Promise<void> => {
	if (redisInstance) {
		try {
			await redisInstance.quit();
			console.log('[Redis] Disconnected gracefully.');
		} catch (error) {
			console.error('[Redis] Error during disconnect, forcing exit:', error);
			redisInstance.disconnect();
		} finally {
			redisInstance = null;
		}
	}
};

export const redisService = {
	async get<T = unknown>(key: string): Promise<T | null> {
		try {
			const data = await redisClient.get(key);
			if (!data) return null;
			try {
				return JSON.parse(data) as T;
			} catch {
				return data as unknown as T;
			}
		} catch (error) {
			console.error(`[Redis] Get failed for key "${key}":`, error);
			return null;
		}
	},

	async set(
		key: string,
		value: unknown,
		ttlInSeconds?: number,
	): Promise<'OK' | null> {
		try {
			const payload = typeof value === 'string' ? value : JSON.stringify(value);
			if (ttlInSeconds && ttlInSeconds > 0) {
				return await redisClient.set(key, payload, 'EX', ttlInSeconds);
			}
			return await redisClient.set(key, payload);
		} catch (error) {
			console.error(`[Redis] Set failed for key "${key}":`, error);
			return null;
		}
	},

	async setEx(
		key: string,
		ttlInSeconds: number,
		value: unknown,
	): Promise<'OK' | null> {
		return this.set(key, value, ttlInSeconds);
	},

	async del(...keys: string[]): Promise<number> {
		try {
			if (keys.length === 0) return 0;
			return await redisClient.del(...keys);
		} catch (error) {
			console.error('[Redis] Del failed:', error);
			return 0;
		}
	},

	async exists(...keys: string[]): Promise<number> {
		try {
			if (keys.length === 0) return 0;
			return await redisClient.exists(...keys);
		} catch (error) {
			console.error('[Redis] Exists failed:', error);
			return 0;
		}
	},

	async expire(key: string, ttlInSeconds: number): Promise<boolean> {
		try {
			const result = await redisClient.expire(key, ttlInSeconds);
			return result === 1;
		} catch (error) {
			console.error(`[Redis] Expire failed for key "${key}":`, error);
			return false;
		}
	},

	async ttl(key: string): Promise<number> {
		try {
			return await redisClient.ttl(key);
		} catch (error) {
			console.error(`[Redis] TTL check failed for key "${key}":`, error);
			return -2;
		}
	},

	async keys(pattern: string): Promise<string[]> {
		try {
			return await redisClient.keys(pattern);
		} catch (error) {
			console.error(`[Redis] Keys failed for pattern "${pattern}":`, error);
			return [];
		}
	},

	async flushDb(): Promise<boolean> {
		try {
			await redisClient.flushdb();
			return true;
		} catch (error) {
			console.error('[Redis] FlushDB failed:', error);
			return false;
		}
	},

	async ping(): Promise<string> {
		return await redisClient.ping();
	},

	isReady(): boolean {
		return redisClient.status === 'ready';
	},
};

export default redisService;
