import { Metadata } from 'next';
import BillingApp from '../../components/BillingApp';

export const metadata: Metadata = {
  title: 'Billing History',
  description: 'View your billing history and statements',
};

export default function BillingPage() {
  return <BillingApp />;
}
