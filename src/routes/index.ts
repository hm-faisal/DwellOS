import { Router } from 'express';
import adminRoutes from '../modules/admin/admin.routes.ts';
import applicationRoutes from '../modules/applications/applications.routes.ts';
import authRoutes from '../modules/auth/auth.routes.ts';
import dashboardRoutes from '../modules/dashboard/dashboard.routes.ts';
import documentRoutes from '../modules/documents/documents.routes.ts';
import leaseRoutes from '../modules/leases/leases.routes.ts';
import maintenanceRoutes from '../modules/maintenance/maintenance.routes.ts';
import notificationRoutes, {
	notificationPreferencesRoutes,
} from '../modules/notifications/notifications.routes.ts';
import paymentRoutes from '../modules/payments/payments.routes.ts';
import propertyRoutes from '../modules/properties/properties.routes.ts';
import rentRoutes from '../modules/rent/rent.routes.ts';
import roommateMatchingRoutes from '../modules/roommate-matching/roommate-matching.routes.ts';
import roomRoutes from '../modules/rooms/rooms.routes.ts';
import searchRoutes from '../modules/search/search.routes.ts';
import userRoutes from '../modules/users/users.routes.ts';
import utilityBillRoutes from '../modules/utility-bills/utility-bills.routes.ts';
import verificationRoutes from '../modules/verification/verification.routes.ts';
import viewingRequestRoutes from '../modules/viewing-requests/viewing-requests.routes.ts';

const router: Router = Router();

const moduleRoutes = [
	{ path: '/auth', route: authRoutes },
	{ path: '/users', route: userRoutes },
	{ path: '/properties', route: propertyRoutes },
	{ path: '/', route: roomRoutes },
	{ path: '/search', route: searchRoutes },
	{ path: '/', route: roommateMatchingRoutes },
	{ path: '/viewing-requests', route: viewingRequestRoutes },
	{ path: '/applications', route: applicationRoutes },
	{ path: '/verifications', route: verificationRoutes },
	{ path: '/leases', route: leaseRoutes },
	{ path: '/', route: rentRoutes },
	{ path: '/payments', route: paymentRoutes },
	{ path: '/', route: utilityBillRoutes },
	{ path: '/', route: maintenanceRoutes },
	{ path: '/', route: documentRoutes },
	{ path: '/notifications', route: notificationRoutes },
	{ path: '/notification-preferences', route: notificationPreferencesRoutes },
	{ path: '/dashboard', route: dashboardRoutes },
	{ path: '/admin', route: adminRoutes },
];

for (const item of moduleRoutes) {
	router.use(item.path, item.route);
}

export default router;
