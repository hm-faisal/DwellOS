import 'dotenv/config';
import pg from 'pg';

let pool: pg.Pool | undefined;

export function getPgPool(): pg.Pool {
	if (!pool) {
		pool = new pg.Pool({
			connectionString: process.env.DATABASE_URL,
			max: 10,
		});
	}
	return pool;
}
