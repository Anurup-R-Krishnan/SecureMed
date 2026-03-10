import { redirect } from 'next/navigation';
import { ROUTES } from '@/lib/routes';

/** /admin → redirects to /admin/dashboard */
export default function AdminIndexPage() {
    redirect(ROUTES.ADMIN_DASHBOARD);
}
