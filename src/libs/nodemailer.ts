import nodemailer, { type SendMailOptions, type Transporter } from 'nodemailer';
import { envConfig } from '../config/index.ts';

let transporterInstance: Transporter | null = null;

export const getTransporter = (): Transporter => {
	if (!transporterInstance) {
		const { host, port, secure, user, pass } = envConfig.nodemailer;

		transporterInstance = nodemailer.createTransport({
			host,
			port,
			secure,
			auth: user && pass ? { user, pass } : undefined,
			tls: {
				rejectUnauthorized: envConfig.isProduction,
			},
		});
	}

	return transporterInstance;
};

export const mailTransporter = getTransporter();

export interface SendMailPayload {
	to: string | string[];
	subject: string;
	html?: string;
	text?: string;
	from?: string;
	cc?: string | string[];
	bcc?: string | string[];
	attachments?: SendMailOptions['attachments'];
}

export const sendEmail = async (payload: SendMailPayload) => {
	const transporter = getTransporter();
	const from = payload.from || envConfig.nodemailer.from;

	try {
		const info = await transporter.sendMail({
			from,
			to: payload.to,
			subject: payload.subject,
			text: payload.text,
			html: payload.html,
			cc: payload.cc,
			bcc: payload.bcc,
			attachments: payload.attachments,
		});

		console.log(
			`[Nodemailer] Email sent successfully to: ${Array.isArray(payload.to) ? payload.to.join(', ') : payload.to} (MessageId: ${info.messageId})`,
		);
		return info;
	} catch (error) {
		console.error('[Nodemailer] Failed to send email:', error);
		throw error;
	}
};

export const verifyEmailConnection = async (): Promise<boolean> => {
	try {
		const transporter = getTransporter();
		await transporter.verify();
		console.log('[Nodemailer] SMTP server connection verified successfully.');
		return true;
	} catch (error) {
		console.warn(
			'[Nodemailer] SMTP verification failed:',
			(error as Error).message,
		);
		return false;
	}
};

export default {
	transporter: mailTransporter,
	sendEmail,
	verifyEmailConnection,
};
