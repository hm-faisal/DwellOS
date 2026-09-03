import type { NextFunction, Request, Response } from "express";
import { type ZodTypeAny, z } from "zod";

export interface RequestValidationSchema {
	body?: ZodTypeAny;
	query?: ZodTypeAny;
	params?: ZodTypeAny;
	cookies?: ZodTypeAny;
}

export const validateRequest = (schema: RequestValidationSchema | ZodTypeAny) => {
	return async (req: Request, _res: Response, next: NextFunction) => {
		try {
			if (
				schema instanceof z.ZodObject &&
				("body" in schema.shape ||
					"query" in schema.shape ||
					"params" in schema.shape ||
					"cookies" in schema.shape)
			) {
				const shape = schema.shape as Record<string, ZodTypeAny>;
				if (shape.body) {
					req.body = await shape.body.parseAsync(req.body);
				}
				if (shape.query) {
					req.query = (await shape.query.parseAsync(req.query)) as any;
				}
				if (shape.params) {
					req.params = (await shape.params.parseAsync(req.params)) as any;
				}
				if (shape.cookies) {
					req.cookies = (await shape.cookies.parseAsync(req.cookies)) as any;
				}
			} else if (
				"body" in schema ||
				"query" in schema ||
				"params" in schema ||
				"cookies" in schema
			) {
				const validationSchema = schema as RequestValidationSchema;
				if (validationSchema.body) {
					req.body = await validationSchema.body.parseAsync(req.body);
				}
				if (validationSchema.query) {
					req.query = (await validationSchema.query.parseAsync(req.query)) as any;
				}
				if (validationSchema.params) {
					req.params = (await validationSchema.params.parseAsync(req.params)) as any;
				}
				if (validationSchema.cookies) {
					req.cookies = (await validationSchema.cookies.parseAsync(req.cookies)) as any;
				}
			} else if (
				"parseAsync" in schema &&
				typeof (schema as ZodTypeAny).parseAsync === "function"
			) {
				req.body = await (schema as ZodTypeAny).parseAsync(req.body);
			}
			next();
		} catch (error) {
			next(error);
		}
	};
};

export default validateRequest;
