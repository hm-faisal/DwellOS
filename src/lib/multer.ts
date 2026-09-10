import type { Request } from 'express';
import multer, { type FileFilterCallback, type Options } from 'multer';
import { BadRequestError } from '../errors/badRequest.error.ts';

// In-memory storage keeps files in buffer for direct streaming to Cloudinary
const storage = multer.memoryStorage();

const defaultImageMimeTypes = [
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif',
	'image/svg+xml',
];

const defaultDocumentMimeTypes = [
	...defaultImageMimeTypes,
	'application/pdf',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'text/plain',
	'text/csv',
];

export const createUploadMiddleware = (
	options: Partial<Options> & { allowedMimeTypes?: string[] } = {},
) => {
	const {
		allowedMimeTypes = defaultImageMimeTypes,
		limits = { fileSize: 10 * 1024 * 1024 }, // 10MB default
		...restOptions
	} = options;

	const fileFilter = (
		_req: Request,
		file: Express.Multer.File,
		cb: FileFilterCallback,
	) => {
		if (
			allowedMimeTypes.length === 0 ||
			allowedMimeTypes.includes(file.mimetype)
		) {
			cb(null, true);
		} else {
			cb(
				new BadRequestError(
					`Unsupported file type: ${file.mimetype}. Allowed types: ${allowedMimeTypes.join(', ')}`,
				),
			);
		}
	};

	return multer({
		storage,
		limits,
		fileFilter,
		...restOptions,
	});
};

export const imageUpload = createUploadMiddleware({
	allowedMimeTypes: defaultImageMimeTypes,
	limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export const documentUpload = createUploadMiddleware({
	allowedMimeTypes: defaultDocumentMimeTypes,
	limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

export const anyFileUpload = multer({
	storage,
	limits: { fileSize: 50 * 1024 * 1024 },
});

export default imageUpload;
