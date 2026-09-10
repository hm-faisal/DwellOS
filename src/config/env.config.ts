import 'dotenv/config';
import process from 'node:process';
import { getEnv, getEnvBoolean, getEnvNumber } from '../utils/getEnv.ts';

export const envConfig = {
	nodeEnv: getEnv('NODE_ENV', 'development'),
	isProduction: getEnv('NODE_ENV', 'development') === 'production',
	isDevelopment: getEnv('NODE_ENV', 'development') === 'development',
	isTest: getEnv('NODE_ENV', 'development') === 'test',
	port: getEnvNumber('PORT', 5000),
	databaseUrl: getEnv('DATABASE_URL', ''),
	corsOrigin: getEnv('CORS_ORIGIN', '*'),

	redis: {
		url: process.env.REDIS_URL || undefined,
		username: process.env.REDIS_USERNAME || 'default',
		host: getEnv('REDIS_HOST', '127.0.0.1'),
		port: getEnvNumber('REDIS_PORT', 6379),
		password: process.env.REDIS_PASSWORD || undefined,
		db: getEnvNumber('REDIS_DB', 0),
		keyPrefix: getEnv('REDIS_KEY_PREFIX', 'dwellos:'),
	},

	stripe: {
		secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key',
		webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock_key',
	},

	cloudinary: {
		cloudName: getEnv('CLOUDINARY_CLOUD_NAME', ''),
		apiKey: getEnv('CLOUDINARY_API_KEY', ''),
		apiSecret:
			process.env.CLOUDINARY_API_KEY_SECRET ||
			process.env.CLOUDINARY_API_SECRET ||
			'',
		folder: getEnv('CLOUDINARY_FOLDER', 'dwellos'),
	},

	nodemailer: {
		host: getEnv('SMTP_HOST', 'smtp.gmail.com'),
		port: getEnvNumber('SMTP_PORT', 465),
		user: process.env.SMTP_USERNAME || process.env.SMTP_USER || '',
		pass: (process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '').trim(),
		from:
			process.env.SMTP_SENDER ||
			process.env.SMTP_FROM ||
			'DwellOS <no-reply@dwellos.com>',
		secure: getEnvBoolean('SMTP_SECURE', true),
	},

	jwt: {
		secret: getEnv('JWT_SECRET', 'super-secret-jwt-key'),
		expiresIn: getEnv('JWT_EXPIRES_IN', '7d'),
		refreshSecret: getEnv('JWT_REFRESH_SECRET', 'super-secret-refresh-key'),
		refreshExpiresIn: getEnv('JWT_REFRESH_EXPIRES_IN', '30d'),
	},
} as const;

export default envConfig;
