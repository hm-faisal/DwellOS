import { Router } from 'express';
import { authenticate } from '../../lib/auth-middleware.ts';
import { requirePropertyScope, requireRoomScope } from '../../lib/rbac.ts';
import { validateRequest } from '../../middlewares/validateRequest.middleware.ts';
import { RoomController } from './rooms.controllers.ts';
import {
	createRoomSchema,
	listPropertyRoomsSchema,
	roomIdParamSchema,
	updateRoomSchema,
} from './rooms.schemas.ts';

const router = Router();

// Routes nested under properties
router.post(
	'/properties/:id/rooms',
	authenticate,
	requirePropertyScope('id'),
	validateRequest(createRoomSchema),
	RoomController.createRoom,
);

router.get(
	'/properties/:id/rooms',
	validateRequest(listPropertyRoomsSchema),
	RoomController.listPropertyRooms,
);

// Direct room routes
router.get(
	'/rooms/:id',
	validateRequest(roomIdParamSchema),
	RoomController.getRoom,
);

router.patch(
	'/rooms/:id',
	authenticate,
	requireRoomScope('id'),
	validateRequest(updateRoomSchema),
	RoomController.updateRoom,
);

router.delete(
	'/rooms/:id',
	authenticate,
	requireRoomScope('id'),
	validateRequest(roomIdParamSchema),
	RoomController.deleteRoom,
);

export default router;
