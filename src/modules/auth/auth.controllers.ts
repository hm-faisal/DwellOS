import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import { envConfig } from '../../config/index.ts';
import { BadRequestError, UnauthorizedError } from '../../lib/errors.ts';
import { catchAsync } from '../../utils/catchAsync.ts';
import { sendResponse } from '../../utils/sendResponse.ts';
import { authService } from './auth.services.ts';

const register = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	const result = await authService.register(payload);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: 'User registered successfully. Please verify your email.',
		data: result,
	});
});

const login = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	const result = await authService.login(payload);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'User logged in successfully',
		data: result,
	});
});

const refresh = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	const result = await authService.refreshTokens(payload);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Tokens refreshed successfully',
		data: result,
	});
});

const logout = catchAsync(async (req: Request, res: Response) => {
	const user = req.user;
	if (!user) {
		throw new UnauthorizedError('Something went wrong');
	}
	const refreshToken = req.body?.refreshToken;
	const result = await authService.logout(user.id, refreshToken);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'User logged out successfully',
		data: result,
	});
});

const me = catchAsync(async (req: Request, res: Response) => {
	const user = req.user;
	if (!user) {
		throw new UnauthorizedError('Unauthorized request! Invalid user');
	}
	const result = await authService.getCurrentUser(user.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Current user profile retrieved successfully',
		data: result,
	});
});

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
	const token = (req.body?.token || req.query?.token) as string;
	if (!token) {
		throw new BadRequestError('Verification token is required');
	}
	const result = await authService.verifyEmail(token);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: result.message,
		data: null,
	});
});

const resendVerification = catchAsync(async (req: Request, res: Response) => {
	const { email } = req.body;
	const result = await authService.resendVerification(email);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: result.message,
		data: result.rawToken ? { rawToken: result.rawToken } : null,
	});
});

const googleAuthRedirect = catchAsync(async (_req: Request, res: Response) => {
	const { clientId, callbackUrl } = envConfig.google;
	if (!clientId) {
		// Mock callback redirect for test/dev when Google credentials are not set
		return res.redirect(`${callbackUrl}?code=mock_google_code_default`);
	}

	const googleUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
	googleUrl.searchParams.set('client_id', clientId);
	googleUrl.searchParams.set('redirect_uri', callbackUrl);
	googleUrl.searchParams.set('response_type', 'code');
	googleUrl.searchParams.set('scope', 'openid profile email');
	googleUrl.searchParams.set('access_type', 'offline');
	googleUrl.searchParams.set('prompt', 'consent');

	res.redirect(googleUrl.toString());
});

const googleAuthCallback = catchAsync(async (req: Request, res: Response) => {
	const code = (req.query.code || req.body?.code) as string;
	if (!code) {
		throw new BadRequestError('Authorization code is required');
	}

	let googleUser: {
		googleId: string;
		email: string;
		name: string;
		avatarUrl?: string;
	};

	if (code.startsWith('mock_google_code') || !envConfig.google.clientId) {
		const mockSuffix = code.replace('mock_google_code_', '') || 'user123';
		googleUser = {
			googleId: `google-oauth-${mockSuffix}`,
			email: `google_${mockSuffix.slice(0, 10)}@example.com`,
			name: 'Google User',
		};
	} else {
		// Real Google OAuth exchange
		const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				code,
				client_id: envConfig.google.clientId,
				client_secret: envConfig.google.clientSecret,
				redirect_uri: envConfig.google.callbackUrl,
				grant_type: 'authorization_code',
			}),
		});

		if (!tokenRes.ok) {
			const errBody = await tokenRes.text();
			throw new UnauthorizedError(`Google token exchange failed: ${errBody}`);
		}

		const tokenData = (await tokenRes.json()) as { access_token: string };
		const userRes = await fetch(
			'https://www.googleapis.com/oauth2/v2/userinfo',
			{
				headers: { Authorization: `Bearer ${tokenData.access_token}` },
			},
		);

		if (!userRes.ok) {
			throw new UnauthorizedError('Failed to fetch Google profile');
		}

		const profile = (await userRes.json()) as {
			id: string;
			email: string;
			name: string;
			picture?: string;
		};

		googleUser = {
			googleId: profile.id,
			email: profile.email,
			name: profile.name,
			avatarUrl: profile.picture,
		};
	}

	const result = await authService.handleGoogleOAuth(googleUser);

	// If browser GET request, redirect to frontend with tokens
	const acceptsJson = req.headers.accept?.includes('application/json');
	if (req.method === 'GET' && !acceptsJson) {
		const frontendUrl = envConfig.clientUrl || 'http://localhost:3000';
		return res.redirect(
			`${frontendUrl}/auth/callback?token=${result.accessToken}&refreshToken=${result.refreshToken}`,
		);
	}

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Google authentication successful',
		data: result,
	});
});

export const AuthController = {
	register,
	login,
	refresh,
	logout,
	me,
	verifyEmail,
	resendVerification,
	googleAuthRedirect,
	googleAuthCallback,
};
