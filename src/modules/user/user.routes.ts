import { Router } from 'express';
import { imageUpload } from '@/middlewares/multer.middleware.ts';
import { validateRequest } from '@/middlewares/validateRequest.middleware.ts';
import { createUser, getUsers, uploadAvatar } from './user.controllers.ts';
import { createUserSchema } from './user.schemas.ts';

const router = Router();

router.get('/', getUsers);
router.post('/', validateRequest(createUserSchema), createUser);
router.post('/:id/avatar', imageUpload.single('avatar'), uploadAvatar);

export const userRoutes = router;
export default userRoutes;
