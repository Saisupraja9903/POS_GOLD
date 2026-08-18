import { useEffect, useState } from 'react';
import { api } from '../auth';
import { EmptyState, ErrorState, Page } from '../components/Page';
import { formatMoney } from '../utils/format';
import { PeriodSummary } from '../components/PeriodSummary';

export function ReportsPage() {
  return <Page title="Reports" subtitle="Sales and gold-weight totals for the selected period"><div className="reports-number-size"><PeriodSummary /></div></Page>;
  /* Legacy report code retained below during the report migration.
  const [summary, setSummary] = useState<any>(null); const [error, setError] = useState('');
  async function loadReport() { try { setSummary((await api.get('/dashboard/summary')).data); } catch { setError('Unable to load POS summary.'); } }
  useEffect(() => { void loadReport(); }, []);
  return <Page title="Counter reports" subtitle="Live operational summary from invoices and physical inventory.">
    {error ? <ErrorState text={error} retry={loadReport} /> : !summary ? <EmptyState text="Loading report…" /> : <>
      <div className="grid grid-cols-3 gap-[13px] max-[760px]:grid-cols-2">{[["Today's sales", formatMoney(summary.today_sales)], ['Bills', summary.today_bills], ['Gold sold', `${summary.sold_gross_weight} g`], ['Fine gold sold', `${summary.sold_fine_weight} g`], ['Available pieces', summary.available_pieces], ['Available gross', `${summary.available_gross_weight} g`]].map(([label, value]) => <article className="rounded-[9px] border border-[#e7e4dc] bg-white p-5"><small className="text-[9px] text-[#82847f]">{label}</small><strong className="mt-[10px] block overflow-wrap-anywhere font-['Cormorant_Garamond'] text-[27px] font-bold">{value}</strong></article>)}</div>
      <div className="mt-[18px] border border-[#e7e4dc] bg-white p-6"><h3>Day closing</h3><p className="text-[11px] text-[#82847f]">Counter closing is unavailable until the shared day-closing transaction API is implemented.</p></div>
    </>}
  </Page>;
  */
}
