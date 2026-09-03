import crypto from 'node:crypto';
import { BadRequestError } from '@/errors/badRequest.error.ts';
import { db } from '@/libs/db.ts';
import { sendEmail } from '@/libs/nodemailer.ts';
import { redisService } from '@/libs/redis.ts';

export const sendOtpService = async (email: string) => {
	// Generate 6-digit cryptographic OTP
	const otp = crypto.randomInt(100000, 999999).toString();

	// Store OTP in Redis with 5 minutes (300 seconds) expiration
	const cacheKey = `otp:${email.toLowerCase()}`;
	await redisService.setEx(cacheKey, 300, otp);

	// Send OTP via Nodemailer
	await sendEmail({
		to: email,
		subject: 'Your DwellOS Verification Code',
		html: `
			<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
				<h2>DwellOS Verification Code</h2>
				<p>Your one-time verification code is:</p>
				<div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563eb; margin: 20px 0;">
					${otp}
				</div>
				<p>This code will expire in 5 minutes. If you did not request this, please ignore this email.</p>
			</div>
		`,
		text: `Your DwellOS verification code is ${otp}. It expires in 5 minutes.`,
	});

	return { email, expiresInSeconds: 300 };
};

export const verifyOtpService = async (email: string, otp: string) => {
	const cacheKey = `otp:${email.toLowerCase()}`;
	const storedOtp = await redisService.get<string>(cacheKey);

	if (!storedOtp) {
		throw new BadRequestError('Verification code has expired or is invalid.');
	}

	if (storedOtp !== otp) {
		throw new BadRequestError('Incorrect verification code.');
	}

	// Delete used OTP
	await redisService.del(cacheKey);

	return { verified: true, email };
};

export const registerUserService = async (data: {
	email: string;
	name?: string;
	username?: string;
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

	await redisService.del('users:list');
	return user;
};

export default {
	sendOtpService,
	verifyOtpService,
	registerUserService,
};
