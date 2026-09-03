import type { RedisOptions } from 'ioredis';
import { envConfig } from './env.config.ts';

export const redisConfig: RedisOptions = {
	...(envConfig.redis.url
		? {}
		: {
				host: envConfig.redis.host,
				port: envConfig.redis.port,
				username: envConfig.redis.username,
				password: envConfig.redis.password,
				db: envConfig.redis.db,
			}),
	keyPrefix: envConfig.redis.keyPrefix,
	maxRetriesPerRequest: 3,
	enableReadyCheck: true,
	lazyConnect: true,
	retryStrategy(times: number) {
		if (times > 10) {
			console.warn('[Redis] Maximum reconnect attempts reached.');
			return null;
		}
		const delay = Math.min(times * 200, 3000);
		return delay;
	},
	reconnectOnError(err: Error) {
		const targetError = 'READONLY';
		if (err.message.includes(targetError)) {
			return true;
		}
		return false;
	},
};

export default redisConfig;
