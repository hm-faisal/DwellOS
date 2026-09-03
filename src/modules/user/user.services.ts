import { uploadMulterFile } from '@/libs/cloudinary.ts';
import { db } from '@/libs/db.ts';
import { sendEmail } from '@/libs/nodemailer.ts';
import { redisService } from '@/libs/redis.ts';
import { listUsers } from '@/prisma/users.ts';

export const getAllUsersService = async () => {
	const cacheKey = 'users:list';
	const cached = await redisService.get(cacheKey);
	if (cached) {
		return { users: cached, fromCache: true };
	}

	const users = await listUsers(50);
	await redisService.set(cacheKey, users, 60); // 60 seconds cache

	return { users, fromCache: false };
};

export const createUserService = async (data: {
	email: string;
	username?: string;
	name?: string;
}) => {
	const user = await db.orm.public.User.upsert({
		create: {
			email: data.email,
			username: data.username,
			name: data.name,
		},
		update: {
			username: data.username,
			name: data.name,
		},
		conflictOn: { email: data.email },
	});

	// Invalidate user cache
	await redisService.del('users:list');

	// Send welcome email asynchronously (non-blocking)
	sendEmail({
		to: data.email,
		subject: 'Welcome to DwellOS!',
		html: `<h1>Welcome ${data.name || data.username || 'User'}!</h1><p>We are delighted to have you on board with DwellOS.</p>`,
	}).catch((err) => {
		console.warn(
			`[User Service] Failed to send welcome email to ${data.email}:`,
			err.message,
		);
	});

	return user;
};

export const uploadUserAvatarService = async (
	userId: string,
	file: Express.Multer.File,
) => {
	const uploadResult = await uploadMulterFile(file, {
		folder: `dwellos/avatars/${userId}`,
	});

	// Cache or update user profile with avatar
	await redisService.set(
		`user:${userId}:avatar`,
		uploadResult.secure_url,
		3600,
	);

	return {
		userId,
		avatarUrl: uploadResult.secure_url,
		publicId: uploadResult.public_id,
	};
};

export default {
	getAllUsersService,
	createUserService,
	uploadUserAvatarService,
};
