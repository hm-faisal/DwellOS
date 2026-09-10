import { z } from 'zod';

export const uploadDocumentSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Lease ID is required'),
		})
		.strict(),
	body: z
		.object({
			title: z.string().trim().min(1, 'Title is required').max(200),
			type: z.enum([
				'LEASE_AGREEMENT',
				'ADDENDUM',
				'INSPECTION_REPORT',
				'OTHER',
			]),
			fileUrl: z.string().trim().min(1, 'File URL is required'),
			version: z.number().int().positive().default(1),
		})
		.strict(),
});

export const documentIdParamSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Document ID is required'),
		})
		.strict(),
});

export const signDocumentSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Document ID is required'),
		})
		.strict(),
	body: z
		.object({
			signatureUrl: z.string().trim().min(1).optional(),
		})
		.strict()
		.optional(),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>['body'];
export type SignDocumentInput = z.infer<typeof signDocumentSchema>['body'];
