import { BusinessRuleError, NotFoundError } from '../../lib/errors.ts';
import { nowInstant, paginateResults, prisma, recordAuditLog, toInstant } from '../../lib/prisma.ts';
import type { RoommateApprovalInput, UpsertProfileInput } from './roommate-matching.schemas.ts';

export class RoommateMatchingService {
	/**
	 * Compute explainable compatibility score between two profiles
	 */
	calculateCompatibility(p1: any, p2: any): { score: number; breakdown: Record<string, number> } {
		let score = 0;
		const breakdown: Record<string, number> = {
			budget: 0,
			sleep: 0,
			work: 0,
			habits: 0,
			cleanliness: 0,
		};

		// 1. Budget overlap (up to 30 pts)
		if (p1.budgetMin && p1.budgetMax && p2.budgetMin && p2.budgetMax) {
			const overlapStart = Math.max(p1.budgetMin, p2.budgetMin);
			const overlapEnd = Math.min(p1.budgetMax, p2.budgetMax);
			if (overlapStart <= overlapEnd) {
				breakdown.budget = 30;
			} else {
				const gap = overlapStart - overlapEnd;
				breakdown.budget = Math.max(0, 30 - Math.floor(gap / 10000));
			}
		} else {
			breakdown.budget = 20; // neutral
		}
		score += breakdown.budget;

		// 2. Cleanliness compatibility (up to 25 pts)
		if (p1.cleanliness && p2.cleanliness) {
			if (p1.cleanliness === p2.cleanliness) {
				breakdown.cleanliness = 25;
			} else if (
				(p1.cleanliness === 'VERY_CLEAN' && p2.cleanliness === 'RELAXED') ||
				(p1.cleanliness === 'RELAXED' && p2.cleanliness === 'VERY_CLEAN')
			) {
				breakdown.cleanliness = 5;
			} else {
				breakdown.cleanliness = 15;
			}
		} else {
			breakdown.cleanliness = 15;
		}
		score += breakdown.cleanliness;

		// 3. Sleep schedule (up to 15 pts)
		if (p1.sleepSchedule && p2.sleepSchedule) {
			if (p1.sleepSchedule === p2.sleepSchedule || p1.sleepSchedule === 'FLEXIBLE' || p2.sleepSchedule === 'FLEXIBLE') {
				breakdown.sleep = 15;
			} else {
				breakdown.sleep = 5;
			}
		} else {
			breakdown.sleep = 10;
		}
		score += breakdown.sleep;

		// 4. Work schedule (up to 15 pts)
		if (p1.workSchedule && p2.workSchedule) {
			breakdown.work = p1.workSchedule === p2.workSchedule ? 15 : 10;
		} else {
			breakdown.work = 10;
		}
		score += breakdown.work;

		// 5. Habits: smoking & pets (up to 15 pts)
		let habitsScore = 15;
		if (p1.smoking !== p2.smoking) habitsScore -= 8;
		if (p1.pets !== p2.pets) habitsScore -= 7;
		breakdown.habits = Math.max(0, habitsScore);
		score += breakdown.habits;

		return {
			score: Math.min(100, Math.max(0, score)),
			breakdown,
		};
	}

	async upsertProfile(userId: string, input: UpsertProfileInput) {
		const existing = await prisma.RoommateProfile.first({ userId });

		if (existing) {
			return await prisma.RoommateProfile.where({ userId }).update({
				budgetMin: input.budgetMin ?? existing.budgetMin,
				budgetMax: input.budgetMax ?? existing.budgetMax,
				lifestyleTags: input.lifestyleTags ?? existing.lifestyleTags,
				sleepSchedule: input.sleepSchedule ?? existing.sleepSchedule,
				workSchedule: input.workSchedule ?? existing.workSchedule,
				smoking: input.smoking !== undefined ? input.smoking : existing.smoking,
				pets: input.pets !== undefined ? input.pets : existing.pets,
				cleanliness: input.cleanliness ?? existing.cleanliness,
				bio: input.bio !== undefined ? input.bio : existing.bio,
				moveInDate: input.moveInDate ? toInstant(input.moveInDate) : existing.moveInDate,
				updatedAt: nowInstant(),
			});
		}

		return await prisma.RoommateProfile.create({
			id: crypto.randomUUID(),
			userId,
			budgetMin: input.budgetMin ?? null,
			budgetMax: input.budgetMax ?? null,
			lifestyleTags: input.lifestyleTags ?? [],
			sleepSchedule: input.sleepSchedule ?? null,
			workSchedule: input.workSchedule ?? null,
			smoking: input.smoking ?? false,
			pets: input.pets ?? false,
			cleanliness: input.cleanliness ?? null,
			bio: input.bio ?? null,
			moveInDate: input.moveInDate ? toInstant(input.moveInDate) : null,
			createdAt: nowInstant(),
			updatedAt: nowInstant(),
		});
	}

	async getProfile(userId: string) {
		const profile = await prisma.RoommateProfile.first({ userId });
		if (!profile) {
			throw new NotFoundError('Roommate profile not found');
		}
		const user = await prisma.User.first({ id: userId });
		return {
			...profile,
			user: user ? { id: user.id, name: user.name, email: user.email } : null,
		};
	}

	async getMatches(currentUserId: string, query?: { cursor?: string; limit?: number }) {
		const limit = query?.limit || 20;
		const myProfile = await prisma.RoommateProfile.first({ userId: currentUserId });
		if (!myProfile) {
			throw new BusinessRuleError('Please complete your roommate profile before viewing matches');
		}

		// Find other profiles
		const otherProfiles = await prisma.RoommateProfile.where((p: any) =>
			p.userId.neq(currentUserId),
		).limit(100).all();

		const matches = [];
		for (const other of otherProfiles) {
			const user = await prisma.User.first({ id: other.userId });
			if (!user || user.status !== 'ACTIVE') continue;

			const { score, breakdown } = this.calculateCompatibility(myProfile, other);
			matches.push({
				id: other.id,
				user: {
					id: user.id,
					name: user.name,
					email: user.email,
				},
				profile: other,
				score,
				breakdown,
			});
		}

		matches.sort((a, b) => b.score - a.score);
		return paginateResults(matches, limit);
	}

	async expressInterest(currentUserId: string, targetUserId: string, interested = true) {
		if (currentUserId === targetUserId) {
			throw new BusinessRuleError('Cannot express interest in yourself');
		}

		const target = await prisma.User.first({ id: targetUserId });
		if (!target) {
			throw new NotFoundError('Target user not found');
		}

		// Normalize pair order
		const [u1, u2] = [currentUserId, targetUserId].sort();
		const isUser1 = currentUserId === u1;

		let match = await prisma.RoommateMatch.first({ user1Id: u1, user2Id: u2 });
		const p1 = await prisma.RoommateProfile.first({ userId: u1 });
		const p2 = await prisma.RoommateProfile.first({ userId: u2 });
		const { score, breakdown } = (p1 && p2) ? this.calculateCompatibility(p1, p2) : { score: 50, breakdown: {} };

		if (!match) {
			match = await prisma.RoommateMatch.create({
				id: crypto.randomUUID(),
				user1Id: u1,
				user2Id: u2,
				score,
				breakdown: JSON.stringify(breakdown),
				user1Interest: isUser1 ? interested : false,
				user2Interest: !isUser1 ? interested : false,
				status: 'PENDING',
				createdAt: nowInstant(),
				updatedAt: nowInstant(),
			});
		} else {
			const u1Interest = isUser1 ? interested : match.user1Interest;
			const u2Interest = !isUser1 ? interested : match.user2Interest;
			const isMutual = u1Interest && u2Interest;

			match = await prisma.RoommateMatch.where({ user1Id: u1, user2Id: u2 }).update({
				user1Interest: u1Interest,
				user2Interest: u2Interest,
				status: isMutual ? 'MUTUAL_INTEREST' : (!u1Interest || !u2Interest ? 'DECLINED' : 'PENDING'),
				updatedAt: nowInstant(),
			});

			if (isMutual) {
				// Create notification for both users
				await prisma.Notification.create({
					id: crypto.randomUUID(),
					userId: currentUserId,
					title: 'Mutual Roommate Interest!',
					message: `You and ${target.name} both expressed interest in rooming together!`,
					category: 'MATCH',
					channel: 'IN_APP',
					isRead: false,
					data: JSON.stringify({ matchId: match.id, targetUserId }),
					createdAt: nowInstant(),
				});
				await prisma.Notification.create({
					id: crypto.randomUUID(),
					userId: targetUserId,
					title: 'Mutual Roommate Interest!',
					message: `A roommate match with interest has been confirmed!`,
					category: 'MATCH',
					channel: 'IN_APP',
					isRead: false,
					data: JSON.stringify({ matchId: match.id, targetUserId: currentUserId }),
					createdAt: nowInstant(),
				});
			}
		}

		return match;
	}

	async approveRoommate(roomId: string, input: RoommateApprovalInput, approverId: string) {
		const room = await prisma.Room.first({ id: roomId });
		if (!room) {
			throw new NotFoundError('Room not found');
		}

		const property = await prisma.Property.first({ id: room.propertyId });
		if (property && !property.requiresRoommateApproval) {
			console.log(`[RoommateApproval] Property ${property.id} does not require roommate approval.`);
		}

		const approval = await prisma.RoommateApproval.create({
			id: crypto.randomUUID(),
			roomId,
			applicationId: input.applicationId ?? null,
			approverId,
			status: input.status,
			comments: input.comments ?? null,
			createdAt: nowInstant(),
			updatedAt: nowInstant(),
		});

		await recordAuditLog(prisma, {
			actorId: approverId,
			entityType: 'RoommateApproval',
			entityId: approval.id,
			action: 'ROOMMATE_APPROVAL_SUBMIT',
			afterState: approval,
		});

		return approval;
	}
}

export const roommateMatchingService = new RoommateMatchingService();
