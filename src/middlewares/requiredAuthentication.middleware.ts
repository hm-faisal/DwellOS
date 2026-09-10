import { authenticate } from '../lib/auth-middleware.ts';

export const requiredAuthentication = authenticate;
export default requiredAuthentication;
