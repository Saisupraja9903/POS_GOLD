import { useEffect, useState } from 'react';
import { api } from '../auth';
import { EmptyState, ErrorState, Page } from '../components/Page';
import { formatMoney } from '../utils/format';
import '../styles/reports.css';

export function ReportsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState('');

  async function loadReport() {
    try { setSummary((await api.get('/dashboard/summary')).data); }
    catch { setError('Unable to load POS summary.'); }
  }

  useEffect(() => { void loadReport(); }, []);

  return (
    <Page title="Counter reports" subtitle="Live operational summary from invoices and physical inventory.">
      {error ? <ErrorState text={error} retry={loadReport} /> : !summary ? <EmptyState text="Loading report…" /> : <>
        <div className="report-grid">
          {[["Today's sales", formatMoney(summary.today_sales)], ['Bills', summary.today_bills], ['Gold sold', `${summary.sold_gross_weight} g`], ['Fine gold sold', `${summary.sold_fine_weight} g`], ['Available pieces', summary.available_pieces], ['Available gross', `${summary.available_gross_weight} g`]].map(([label, value]) => <article key={label}><small>{label}</small><strong>{value}</strong></article>)}
        </div>
        <div className="dark-card"><h3>Day closing</h3><p>Counter closing is unavailable until the shared day-closing transaction API is implemented.</p></div>
      </>}
    </Page>
  );
}
