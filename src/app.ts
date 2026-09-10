import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, {
	type Application,
	type Request,
	type Response,
} from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { envConfig } from './config/index.ts';
import { globalErrorHandler } from './middlewares/globalErrorHandler.middleware.ts';
import { notFoundHandler } from './middlewares/notFound.middleware.ts';
import { sanitizeInput } from './middlewares/sanitize.middleware.ts';
import { healthRoutes } from './modules/health/health.routes.ts';
import appRoutes from './routes/index.ts';

export const createApp = (): Application => {
	const app = express();

	// Security & Parsing Middlewares
	app.use(helmet());
	app.use(
		cors({
			origin: envConfig.corsOrigin === '*' ? true : envConfig.corsOrigin,
			credentials: true,
		}),
	);
	app.use(express.json({ limit: '10mb' }));
	app.use(express.urlencoded({ extended: true, limit: '10mb' }));
	app.use(cookieParser());
	app.use(sanitizeInput);

	// Request Logging with Morgan
	if (envConfig.nodeEnv !== 'test') {
		app.use(morgan('dev'));
	}

	// Root welcome & info route
	app.get('/', (_req: Request, res: Response) => {
		res.status(200).json({
			data: {
				name: 'DwellOS Backend API',
				version: '1.0.0',
				status: 'healthy',
				postmanCollection: '/postman_collection.json',
				postmanEnvironment: '/postman_environment.json',
				timestamp: new Date().toISOString(),
			},
			error: null,
		});
	});

	// Postman collection & environment endpoints
	app.get('/postman_collection.json', (_req: Request, res: Response) => {
		const collectionPath = path.resolve(
			process.cwd(),
			'postman_collection.json',
		);
		if (fs.existsSync(collectionPath)) {
			res.setHeader('Content-Type', 'application/json');
			res.send(fs.readFileSync(collectionPath, 'utf8'));
		} else {
			res
				.status(404)
				.json({
					data: null,
					error: { code: 'NOT_FOUND', message: 'Postman collection not found' },
				});
		}
	});

	app.get('/postman_environment.json', (_req: Request, res: Response) => {
		const envPath = path.resolve(process.cwd(), 'postman_environment.json');
		if (fs.existsSync(envPath)) {
			res.setHeader('Content-Type', 'application/json');
			res.send(fs.readFileSync(envPath, 'utf8'));
		} else {
			res
				.status(404)
				.json({
					data: null,
					error: {
						code: 'NOT_FOUND',
						message: 'Postman environment not found',
					},
				});
		}
	});

	// API Routes
	app.use('/health', healthRoutes);
	app.use('/api/v1', appRoutes);

	// 404 Not Found Middleware
	app.use(notFoundHandler);

	// Global Error Handler Middleware
	app.use(globalErrorHandler);

	return app;
};

export const app = createApp();
export default app;
