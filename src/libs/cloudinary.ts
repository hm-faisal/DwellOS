import type { Readable } from 'node:stream';
import {
	v2 as cloudinary,
	type DeliveryType,
	type UploadApiOptions,
	type UploadApiResponse,
} from 'cloudinary';
import { envConfig } from '../config/index.ts';

cloudinary.config({
	cloud_name: envConfig.cloudinary.cloudName,
	api_key: envConfig.cloudinary.apiKey,
	api_secret: envConfig.cloudinary.apiSecret,
	secure: true,
});

export const cloudinaryClient = cloudinary;

export const uploadFile = async (
	filePathOrBase64: string,
	options: UploadApiOptions = {},
): Promise<UploadApiResponse> => {
	const mergedOptions: UploadApiOptions = {
		folder: envConfig.cloudinary.folder,
		resource_type: 'auto',
		...options,
	};
	return await cloudinary.uploader.upload(filePathOrBase64, mergedOptions);
};

export const uploadBuffer = async (
	buffer: Buffer,
	options: UploadApiOptions = {},
): Promise<UploadApiResponse> => {
	const mergedOptions: UploadApiOptions = {
		folder: envConfig.cloudinary.folder,
		resource_type: 'auto',
		...options,
	};

	return new Promise((resolve, reject) => {
		const uploadStream = cloudinary.uploader.upload_stream(
			mergedOptions,
			(error, result) => {
				if (error || !result) {
					return reject(
						error ?? new Error('Cloudinary upload returned an empty response'),
					);
				}
				resolve(result);
			},
		);
		uploadStream.end(buffer);
	});
};

export const uploadStream = async (
	stream: Readable,
	options: UploadApiOptions = {},
): Promise<UploadApiResponse> => {
	const mergedOptions: UploadApiOptions = {
		folder: envConfig.cloudinary.folder,
		resource_type: 'auto',
		...options,
	};

	return new Promise((resolve, reject) => {
		const streamUploader = cloudinary.uploader.upload_stream(
			mergedOptions,
			(error, result) => {
				if (error || !result) {
					return reject(
						error ?? new Error('Cloudinary stream upload returned no result'),
					);
				}
				resolve(result);
			},
		);
		stream.pipe(streamUploader);
	});
};

/**
 * Upload an Express Multer in-memory file directly to Cloudinary
 */
export const uploadMulterFile = async (
	file: Express.Multer.File,
	options: UploadApiOptions = {},
): Promise<UploadApiResponse> => {
	if (!file?.buffer) {
		throw new Error('No file buffer provided for Cloudinary upload.');
	}

	const fileName = file.originalname
		? file.originalname.split('.')[0]?.replace(/[^a-zA-Z0-9_-]/g, '_')
		: undefined;

	return await uploadBuffer(file.buffer, {
		public_id: fileName ? `${fileName}_${Date.now()}` : undefined,
		...options,
	});
};

/**
 * Upload multiple Express Multer files concurrently to Cloudinary
 */
export const uploadMulterFiles = async (
	files: Express.Multer.File[],
	options: UploadApiOptions = {},
): Promise<UploadApiResponse[]> => {
	if (!files || files.length === 0) return [];
	return await Promise.all(
		files.map((file) => uploadMulterFile(file, options)),
	);
};

export const deleteFile = async (
	publicId: string,
	options?: { resource_type?: 'image' | 'video' | 'raw'; type?: DeliveryType },
) => {
	return await cloudinary.uploader.destroy(publicId, options);
};

export const deleteFiles = async (
	publicIds: string[],
	options?: { resource_type?: 'image' | 'video' | 'raw' },
) => {
	if (publicIds.length === 0) return null;
	return await cloudinary.api.delete_resources(publicIds, options);
};

export const getOptimizedUrl = (
	publicId: string,
	options: Record<string, unknown> = {},
): string => {
	return cloudinary.url(publicId, {
		fetch_format: 'auto',
		quality: 'auto',
		secure: true,
		...options,
	});
};

export const pingCloudinary = async (): Promise<boolean> => {
	try {
		if (
			!envConfig.cloudinary.cloudName ||
			!envConfig.cloudinary.apiKey ||
			!envConfig.cloudinary.apiSecret
		) {
			return false;
		}
		const res = await cloudinary.api.ping();
		return res.status === 'ok';
	} catch (error) {
		console.warn('[Cloudinary] Ping check failed:', error);
		return false;
	}
};

export default {
	client: cloudinaryClient,
	uploadFile,
	uploadBuffer,
	uploadStream,
	uploadMulterFile,
	uploadMulterFiles,
	deleteFile,
	deleteFiles,
	getOptimizedUrl,
	pingCloudinary,
};
