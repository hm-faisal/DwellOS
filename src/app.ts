import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, {
	type Application,
	type Request,
	type Response,
} from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { envConfig } from '@/config/index.ts';
import { globalErrorHandler } from '@/middlewares/globalErrorHandler.middleware.ts';
import { notFoundHandler } from '@/middlewares/notFound.middleware.ts';
import { healthRoutes } from '@/modules/health/health.routes.ts';
import appRoutes from '@/routes';

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

	// Request Logging with Morgan
	app.use(morgan('combined'));

	// Root welcome & info route
	app.get('/', (_req: Request, res: Response) => {
		res.status(200).json({
			success: true,
			message: 'DwellOS Backend API is running smoothly',
			environment: envConfig.nodeEnv,
			timestamp: new Date().toISOString(),
		});
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
