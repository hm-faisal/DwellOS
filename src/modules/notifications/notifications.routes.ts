import { Router } from 'express';
import { authenticate } from '../../lib/auth-middleware.ts';
import { validateRequest } from '../../middlewares/validateRequest.middleware.ts';
import { NotificationController } from './notifications.controllers.ts';
import {
	listNotificationsQuerySchema,
	notificationIdParamSchema,
	updateNotificationPreferencesSchema,
} from './notifications.schemas.ts';

const router = Router();

router.get(
	'/',
	authenticate,
	validateRequest(listNotificationsQuerySchema),
	NotificationController.listNotifications,
);

router.patch(
	'/:id/read',
	authenticate,
	validateRequest(notificationIdParamSchema),
	NotificationController.markAsRead,
);

router.get('/preferences', authenticate, NotificationController.getPreferences);

router.patch(
	'/preferences',
	authenticate,
	validateRequest(updateNotificationPreferencesSchema),
	NotificationController.updatePreferences,
);

export default router;
