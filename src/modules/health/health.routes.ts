import { Router } from 'express';
import { HealthController } from './health.controllers.ts';

const router = Router();

router.get('/', HealthController.healthCheck);

export const healthRoutes = router;
export default healthRoutes;
