import { Page } from '../components/Page';
import { PeriodSummary } from '../components/PeriodSummary';

export function BranchDashboardPage() {
  return <Page title="Branch dashboard" subtitle="Branch-level jewellery sales performance by period"><PeriodSummary /></Page>;
}
