import process from 'node:process';
import { envConfig } from '../../config/index.ts';
import { pingCloudinary } from '../../lib/cloudinary.ts';
import { verifyEmailConnection } from '../../lib/nodemailer.ts';
import { redisService } from '../../lib/redis.ts';
import { connectDatabase } from '../../prisma/db.ts';

export interface SystemHealth {
	status: 'ok' | 'degraded' | 'error';
	timestamp: string;
	uptimeSeconds: number;
	environment: string;
	services: {
		database: {
			status: 'connected' | 'disconnected' | 'unknown';
			latencyMs?: number;
			error?: string;
		};
		redis: {
			status: 'connected' | 'disconnected';
			latencyMs?: number;
			error?: string;
		};
		cloudinary: {
			status: 'connected' | 'not_configured' | 'error';
		};
		nodemailer: {
			status: 'connected' | 'not_configured' | 'error';
		};
	};
	memory: {
		heapUsedMB: number;
		heapTotalMB: number;
		rssMB: number;
	};
}

export const getHealthStatus = async (): Promise<SystemHealth> => {
	const mem = process.memoryUsage();

	// Database check
	let dbStatus: 'connected' | 'disconnected' | 'unknown' = 'unknown';
	let dbLatency: number | undefined;
	let dbError: string | undefined;

	try {
		const start = Date.now();
		await connectDatabase();
		dbLatency = Date.now() - start;
		dbStatus = 'connected';
	} catch (error) {
		dbStatus = 'disconnected';
		dbError = (error as Error).message;
	}

	// Redis check
	let redisStatus: 'connected' | 'disconnected' = 'disconnected';
	let redisLatency: number | undefined;
	let redisError: string | undefined;

	try {
		const start = Date.now();
		const pong = await redisService.ping();
		if (pong === 'PONG') {
			redisLatency = Date.now() - start;
			redisStatus = 'connected';
		}
	} catch (error) {
		redisStatus = 'disconnected';
		redisError = (error as Error).message;
	}

	// Cloudinary check
	let cloudinaryStatus: 'connected' | 'not_configured' | 'error' =
		'not_configured';
	if (envConfig.cloudinary.cloudName && envConfig.cloudinary.apiKey) {
		const cloudOk = await pingCloudinary();
		cloudinaryStatus = cloudOk ? 'connected' : 'error';
	}

	// Nodemailer check
	let emailStatus: 'connected' | 'not_configured' | 'error' = 'not_configured';
	if (envConfig.nodemailer.user && envConfig.nodemailer.pass) {
		const emailOk = await verifyEmailConnection();
		emailStatus = emailOk ? 'connected' : 'error';
	}

	const overallStatus: 'ok' | 'degraded' | 'error' =
		dbStatus === 'connected' && redisStatus === 'connected'
			? 'ok'
			: dbStatus === 'connected' || redisStatus === 'connected'
				? 'degraded'
				: 'error';

	return {
		status: overallStatus,
		timestamp: new Date().toISOString(),
		uptimeSeconds: Math.floor(process.uptime()),
		environment: envConfig.nodeEnv,
		services: {
			database: {
				status: dbStatus,
				latencyMs: dbLatency,
				error: dbError,
			},
			redis: {
				status: redisStatus,
				latencyMs: redisLatency,
				error: redisError,
			},
			cloudinary: {
				status: cloudinaryStatus,
			},
			nodemailer: {
				status: emailStatus,
			},
		},
		memory: {
			heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
			heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
			rssMB: Math.round(mem.rss / 1024 / 1024),
		},
	};
};

export default {
	getHealthStatus,
};
