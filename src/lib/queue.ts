import { getRedisClient } from './redis.ts';

export type JobHandler = () => Promise<void>;

export interface ScheduledJob {
	name: string;
	intervalMs: number;
	handler: JobHandler;
	timer?: NodeJS.Timeout;
}

class LightweightScheduler {
	private jobs: Map<string, ScheduledJob> = new Map();
	private isRunning = false;

	/**
	 * Register a recurring background job
	 */
	registerJob(name: string, intervalMs: number, handler: JobHandler): void {
		this.jobs.set(name, {
			name,
			intervalMs,
			handler,
		});
	}

	/**
	 * Acquire distributed lock using Redis
	 */
	private async acquireLock(name: string, ttlMs: number): Promise<string | null> {
		try {
			const redis = getRedisClient();
			const token = crypto.randomUUID();
			const result = await redis.set(`dwellos:job:lock:${name}`, token, 'PX', ttlMs, 'NX');
			return result === 'OK' ? token : null;
		} catch {
			// If Redis is unreachable, execute locally
			return 'local-lock';
		}
	}

	/**
	 * Release distributed lock
	 */
	private async releaseLock(name: string, token: string): Promise<void> {
		if (token === 'local-lock') return;
		try {
			const redis = getRedisClient();
			const lockKey = `dwellos:job:lock:${name}`;
			const currentVal = await redis.get(lockKey);
			if (currentVal === token) {
				await redis.del(lockKey);
			}
		} catch {
			// ignore redis release error
		}
	}

	/**
	 * Start running all scheduled jobs
	 */
	start(): void {
		if (this.isRunning) return;
		this.isRunning = true;
		console.log(`[Scheduler] Starting lightweight job scheduler with ${this.jobs.size} jobs...`);

		for (const [name, job] of this.jobs) {
			// Run once shortly after startup
			setTimeout(() => this.runJob(name), 3000);

			// Schedule repeated interval
			job.timer = setInterval(() => this.runJob(name), job.intervalMs);
		}
	}

	/**
	 * Execute a single job with locking
	 */
	async runJob(name: string): Promise<void> {
		const job = this.jobs.get(name);
		if (!job) return;

		const lockToken = await this.acquireLock(name, job.intervalMs - 500);
		if (!lockToken) {
			return; // Another instance is running this job
		}

		try {
			console.log(`[Scheduler] Running background job: ${name}`);
			await job.handler();
			console.log(`[Scheduler] Job finished successfully: ${name}`);
		} catch (error) {
			console.error(`[Scheduler] Job ${name} failed:`, error);
		} finally {
			await this.releaseLock(name, lockToken);
		}
	}

	/**
	 * Stop all timers
	 */
	stop(): void {
		for (const [, job] of this.jobs) {
			if (job.timer) clearInterval(job.timer);
		}
		this.isRunning = false;
		console.log('[Scheduler] Stopped all scheduled jobs.');
	}
}

export const scheduler = new LightweightScheduler();
