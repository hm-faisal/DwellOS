import 'dotenv/config';
import { defineConfig as ormConfig } from '@prisma/orm-postgres/config';
import { definePrismaConfig } from 'prisma/config';

export default definePrismaConfig({
	skills: {
		agents: ['claude', 'cursor', 'agents', 'devin'],
	},
	orm: ormConfig({
		contract: './src/prisma/contract.ts',
		output: './src/prisma/generated',
		db: {
			connection: process.env.DATABASE_URL,
		},
	}),
	composer: {
		configPath: './prisma-composer.config.ts',
	},
});
