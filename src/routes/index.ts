import { Router } from 'express';
import authRoutes from '@/modules/auth/auth.routes';
import userRoutes from '@/modules/user/user.routes';

const router: Router = Router();

type Route = {
	path: string;
	router: Router;
};
const routes: Route[] = [
	{
		path: '/user',
		router: userRoutes,
	},
	{
		path: '/auth',
		router: authRoutes,
	},
];

routes.forEach((route) => {
	router.use(route.path, route.router);
});

export default router;
