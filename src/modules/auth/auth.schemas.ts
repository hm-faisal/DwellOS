import { z } from 'zod';
import emailSchema from '@/schemas/Email.schema.ts';
import passwordSchema from '@/schemas/Password.schema.ts';

export const registerSchema = z.object({
	body: z.object({
		email: emailSchema,
		password: passwordSchema,
		name: z.string().trim().min(2).optional(),
		username: z.string().trim().min(3).optional(),
	}),
});

export const loginSchema = z.object({
	body: z.object({
		email: emailSchema,
		password: z.string().min(1, 'Password is required'),
	}),
});

export const sendOtpSchema = z.object({
	body: z.object({
		email: emailSchema,
	}),
});

export const verifyOtpSchema = z.object({
	body: z.object({
		email: emailSchema,
		otp: z.string().length(6, 'OTP must be exactly 6 digits'),
	}),
});

export default {
	registerSchema,
	loginSchema,
	sendOtpSchema,
	verifyOtpSchema,
};
