import type { NextFunction, Request, Response } from 'express';
import { uploadMulterFile } from '../libs/cloudinary.ts';
import {
	anyFileUpload,
	createUploadMiddleware,
	documentUpload,
	imageUpload,
} from '../libs/multer.ts';

export { anyFileUpload, createUploadMiddleware, documentUpload, imageUpload };

export const uploadSingleImage = (fieldName: string) => {
	return imageUpload.single(fieldName);
};

export const uploadMultipleImages = (fieldName: string, maxCount = 10) => {
	return imageUpload.array(fieldName, maxCount);
};

export const uploadSingleDocument = (fieldName: string) => {
	return documentUpload.single(fieldName);
};

export const uploadMultipleDocuments = (fieldName: string, maxCount = 10) => {
	return documentUpload.array(fieldName, maxCount);
};

/**
 * Convenience middleware: Parses single image via multer AND uploads directly to Cloudinary,
 * attaching the result to `req.cloudinaryResult` and `req.body[fieldName] = secure_url`
 */
export const uploadAndCloudinarySingle = (
	fieldName: string,
	folder?: string,
) => {
	const multerSingle = imageUpload.single(fieldName);

	return (req: Request, res: Response, next: NextFunction) => {
		multerSingle(req, res, async (err) => {
			if (err) return next(err);
			if (!req.file) return next();

			try {
				const uploadResult = await uploadMulterFile(
					req.file,
					folder ? { folder } : {},
				);
				(req as any).cloudinaryResult = uploadResult;
				(req as any).fileUrl = uploadResult.secure_url;
				next();
			} catch (uploadError) {
				next(uploadError);
			}
		});
	};
};

export default {
	imageUpload,
	documentUpload,
	anyFileUpload,
	uploadSingleImage,
	uploadMultipleImages,
	uploadSingleDocument,
	uploadMultipleDocuments,
	uploadAndCloudinarySingle,
};
