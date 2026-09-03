import { Router } from 'express';
import { healthCheckHandler } from './health.controllers.ts';

const router = Router();

router.get('/', healthCheckHandler);

export const healthRoutes = router;
export default healthRoutes;
