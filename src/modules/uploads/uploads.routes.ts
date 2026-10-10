import { Router, type Request, type Response } from 'express';
import httpStatus from 'http-status';
import { authenticate } from '../../lib/auth-middleware.ts';
import { uploadAndCloudinarySingle } from '../../middlewares/multer.middleware.ts';
import { catchAsync } from '../../utils/catchAsync.ts';
import { sendResponse } from '../../utils/sendResponse.ts';

const router = Router();

router.post(
	'/',
	authenticate,
	uploadAndCloudinarySingle('file', 'dwellos/photos'),
	catchAsync(async (req: Request, res: Response) => {
		const fileUrl = (req as any).fileUrl;
		if (!fileUrl) {
			res.status(httpStatus.BAD_REQUEST).json({
				success: false,
				message: 'No file uploaded or file upload failed',
				data: null,
			});
			return;
		}

		sendResponse(res, {
			statusCode: httpStatus.CREATED,
			success: true,
			message: 'Photo uploaded successfully',
			data: {
				url: fileUrl,
				publicId: (req as any).cloudinaryResult?.public_id,
			},
		});
	}),
);

export default router;
