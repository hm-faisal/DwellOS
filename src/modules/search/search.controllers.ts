import type { Request, Response } from 'express';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync.ts';
import { sendResponse } from '../../utils/sendResponse.ts';
import { searchService } from './search.services.ts';

const searchProperties = catchAsync(async (req: Request, res: Response) => {
	const query = req.query;
	const result = await searchService.searchProperties(query as any);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Search completed successfully',
		data: result,
	});
});

const createSavedSearch = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;
	const payload = req.body;
	const result = await searchService.createSavedSearch(user.id, payload);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: 'Search criteria saved successfully',
		data: result,
	});
});

const getSavedSearches = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;
	const result = await searchService.getSavedSearches(user.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Saved searches retrieved successfully',
		data: result,
	});
});

const deleteSavedSearch = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const user = req.user!;
	const result = await searchService.deleteSavedSearch(id, user.id);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: 'Saved search deleted successfully',
		data: result,
	});
});

export const SearchController = {
	searchProperties,
	createSavedSearch,
	getSavedSearches,
	deleteSavedSearch,
};

export {
	createSavedSearch,
	createSavedSearch as createSavedSearchHandler,
	deleteSavedSearch,
	deleteSavedSearch as deleteSavedSearchHandler,
	getSavedSearches,
	getSavedSearches as getSavedSearchesHandler,
	searchProperties,
	searchProperties as searchPropertiesHandler,
};
