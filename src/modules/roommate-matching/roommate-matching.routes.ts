import { Router } from 'express';
import { authenticate } from '../../lib/auth-middleware.ts';
import { validateRequest } from '../../middlewares/validateRequest.middleware.ts';
import { RoommateMatchingController } from './roommate-matching.controllers.ts';
import {
	expressInterestSchema,
	getProfileParamsSchema,
	matchesQuerySchema,
	roommateApprovalSchema,
	upsertProfileSchema,
} from './roommate-matching.schemas.ts';

const router = Router();

router.post(
	'/roommate-profile',
	authenticate,
	validateRequest(upsertProfileSchema),
	RoommateMatchingController.upsertProfile,
);

router.put(
	'/roommate-profile',
	authenticate,
	validateRequest(upsertProfileSchema),
	RoommateMatchingController.upsertProfile,
);

router.patch(
	'/roommate-profile',
	authenticate,
	validateRequest(upsertProfileSchema),
	RoommateMatchingController.upsertProfile,
);

router.get(
	'/roommate-profile',
	authenticate,
	RoommateMatchingController.getProfile,
);

router.get(
	'/roommate-profile/:userId',
	authenticate,
	validateRequest(getProfileParamsSchema),
	RoommateMatchingController.getProfile,
);

router.get(
	'/matches',
	authenticate,
	validateRequest(matchesQuerySchema),
	RoommateMatchingController.getMatches,
);

router.get(
	'/roommates/matches',
	authenticate,
	validateRequest(matchesQuerySchema),
	RoommateMatchingController.getMatches,
);

router.get(
	'/roommates/search',
	authenticate,
	validateRequest(matchesQuerySchema),
	RoommateMatchingController.getMatches,
);

router.post(
	'/matches/:targetUserId/interest',
	authenticate,
	validateRequest(expressInterestSchema),
	RoommateMatchingController.expressInterest,
);

router.post(
	'/rooms/:id/roommate-approval',
	authenticate,
	validateRequest(roommateApprovalSchema),
	RoommateMatchingController.roommateApproval,
);

export default router;
