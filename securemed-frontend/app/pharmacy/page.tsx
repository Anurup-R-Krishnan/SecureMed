import { redirect } from 'next/navigation';
import { ROUTES } from '@/lib/routes';

/** /pharmacy → redirects to /pharmacy/dashboard */
export default function PharmacyIndexPage() {
    redirect(ROUTES.PHARMACY_DASHBOARD);
}
