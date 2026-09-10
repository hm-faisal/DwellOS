import { z } from 'zod';

export const submitVerificationSchema = z.object({
	body: z
		.object({
			type: z.string().trim().optional(),
			idType: z.string().trim().optional(),
			documentUrl: z.string().trim().min(1).optional(),
			idDocumentUrl: z.string().trim().min(1).optional(),
			incomeProofUrl: z.string().trim().min(1).optional(),
			documentNumber: z.string().trim().optional(),
			notes: z.string().trim().max(1000).optional(),
			remarks: z.string().trim().max(1000).optional(),
			data: z.record(z.string(), z.unknown()).optional(),
		})
		.passthrough()
		.transform((val) => {
			let canonicalType:
				| 'IDENTITY'
				| 'INCOME'
				| 'EMPLOYMENT'
				| 'REFERENCE_CHECK' = 'IDENTITY';

			const rawType = (val.type || val.idType || '').toUpperCase();
			if (
				['INCOME', 'PAYSTUB', 'SALARY'].includes(rawType) ||
				(!val.type && val.incomeProofUrl && !val.idDocumentUrl)
			) {
				canonicalType = 'INCOME';
			} else if (['EMPLOYMENT', 'JOB', 'OFFER_LETTER'].includes(rawType)) {
				canonicalType = 'EMPLOYMENT';
			} else if (['REFERENCE_CHECK', 'REFERENCE'].includes(rawType)) {
				canonicalType = 'REFERENCE_CHECK';
			} else {
				canonicalType = 'IDENTITY';
			}

			const docUrl =
				val.documentUrl || val.idDocumentUrl || val.incomeProofUrl || undefined;

			const extraData: Record<string, unknown> = {
				...(val.data ?? {}),
			};
			if (val.idType) extraData.idType = val.idType;
			if (val.documentNumber) extraData.documentNumber = val.documentNumber;
			if (val.idDocumentUrl) extraData.idDocumentUrl = val.idDocumentUrl;
			if (val.incomeProofUrl) extraData.incomeProofUrl = val.incomeProofUrl;

			const knownKeys = new Set([
				'type',
				'idType',
				'documentUrl',
				'idDocumentUrl',
				'incomeProofUrl',
				'documentNumber',
				'notes',
				'remarks',
				'data',
			]);
			for (const [key, value] of Object.entries(val)) {
				if (!knownKeys.has(key) && value !== undefined) {
					extraData[key] = value;
				}
			}

			return {
				type: canonicalType,
				documentUrl: docUrl,
				notes: val.notes ?? val.remarks,
				data: Object.keys(extraData).length > 0 ? extraData : undefined,
			};
		}),
});

export const verificationIdParamSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Verification ID is required'),
		})
		.passthrough(),
});

export const getVerificationsParamSchema = z.object({
	params: z
		.object({
			userId: z.string().trim().min(1, 'User ID is required'),
		})
		.passthrough(),
});

export const updateVerificationStatusSchema = z.object({
	params: z
		.object({
			id: z.string().trim().min(1, 'Verification ID is required'),
		})
		.passthrough(),
	body: z
		.object({
			status: z.enum(['IN_REVIEW', 'VERIFIED', 'REJECTED']),
			notes: z.string().trim().max(1000).optional(),
			remarks: z.string().trim().max(1000).optional(),
		})
		.passthrough()
		.transform((val) => ({
			status: val.status,
			notes: val.notes ?? val.remarks,
		})),
});

export type SubmitVerificationInput = z.infer<
	typeof submitVerificationSchema
>['body'];
export type UpdateVerificationInput = z.infer<
	typeof updateVerificationStatusSchema
>['body'];
