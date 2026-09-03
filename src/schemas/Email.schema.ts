import { z } from 'zod';

export const emailSchema = z
	.string({
		error: 'Email is required',
	})
	.trim()
	.toLowerCase()
	.email('Please provide a valid email address');

export default emailSchema;
