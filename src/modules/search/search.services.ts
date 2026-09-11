import { NotFoundError } from '../../lib/errors.ts';
import {
	nowInstant,
	paginateResults,
	prisma,
	toInstant,
} from '../../lib/prisma.ts';
import type {
	CreateSavedSearchInput,
	SearchPropertiesQuery,
} from './search.schemas.ts';

export class SearchService {
	async searchProperties(query?: SearchPropertiesQuery) {
		const limit = query?.limit || 20;
		let propertyQuery = prisma.Property.where({ status: 'ACTIVE' });

		if (query?.location) {
			const loc = query.location;
			propertyQuery = propertyQuery.where((p: any) => p.city.ilike(`%${loc}%`));
		}

		propertyQuery = propertyQuery
			.orderBy((p: any) => p.createdAt.desc())
			.limit(limit + 1);

		if (query?.cursor) {
			const cursorRecord = await prisma.Property.first({ id: query.cursor });
			if (cursorRecord) {
				propertyQuery = propertyQuery.cursor({
					createdAt: cursorRecord.createdAt,
				});
			}
		}

		const properties = await propertyQuery.all();

		// Filter matching available rooms and amenities
		const filteredProperties = [];
		for (const prop of properties) {
			if (query?.amenities) {
				const requestedAmenities = query.amenities
					.split(',')
					.map((a) => a.trim().toLowerCase());
				const propAmenities = prop.amenities.map((a: string) =>
					a.toLowerCase(),
				);
				const matches = requestedAmenities.every((a) =>
					propAmenities.includes(a),
				);
				if (!matches) continue;
			}

			let roomQuery = prisma.Room.where({
				propertyId: prop.id,
				status: 'AVAILABLE',
			});
			if (query?.roomType) {
				roomQuery = roomQuery.where({ type: query.roomType });
			}
			if (query?.isFurnished !== undefined) {
				if (query.isFurnished) {
					roomQuery = roomQuery.where((r: any) =>
						r.furnishing.in(['FURNISHED', 'SEMI_FURNISHED']),
					);
				} else {
					roomQuery = roomQuery.where({ furnishing: 'UNFURNISHED' });
				}
			}
			if (query?.moveInDate) {
				roomQuery = roomQuery.where((r: any) =>
					r.availableFrom.lte(toInstant(query.moveInDate)),
				);
			}
			if (query?.priceMin !== undefined) {
				roomQuery = roomQuery.where((r: any) => r.rent.gte(query.priceMin));
			}
			if (query?.priceMax !== undefined) {
				roomQuery = roomQuery.where((r: any) => r.rent.lte(query.priceMax));
			}

			const matchingRooms = await roomQuery.all();
			if (
				matchingRooms.length > 0 ||
				(!query?.priceMin && !query?.priceMax && !query?.roomType)
			) {
				filteredProperties.push({
					...prop,
					availableRooms: matchingRooms,
				});
			}
		}

		return paginateResults(filteredProperties, limit);
	}

	async createSavedSearch(userId: string, input: CreateSavedSearchInput) {
		const id = crypto.randomUUID();
		const savedSearch = await prisma.SavedSearch.create({
			id,
			userId,
			name: input.name ?? null,
			location: input.location ?? null,
			priceMin: input.priceMin ?? null,
			priceMax: input.priceMax ?? null,
			roomType: input.roomType ?? null,
			moveInDate: input.moveInDate ? toInstant(input.moveInDate) : null,
			amenities: input.amenities,
			createdAt: nowInstant(),
		});

		return savedSearch;
	}

	async getSavedSearches(userId: string) {
		return await prisma.SavedSearch.where({ userId })
			.orderBy((s: any) => s.createdAt.desc())
			.all();
	}

	async deleteSavedSearch(id: string, userId: string) {
		const search = await prisma.SavedSearch.first({ id });
		if (!search || search.userId !== userId) {
			throw new NotFoundError('Saved search not found');
		}

		await prisma.SavedSearch.where({ id }).delete();
		return { success: true, message: 'Saved search deleted' };
	}
}

export const searchService = new SearchService();
