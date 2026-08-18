import { useEffect, useState } from 'react';
import { api } from '../auth';
import { EmptyState, ErrorState, Page } from '../components/Page';
import { formatMoney } from '../utils/format';

export function ReturnReportsPage() {
  const [report, setReport] = useState<any>(); const [error, setError] = useState('');
  async function load() { setError(''); try { const {data} = await api.get('/pos/returns', {params:{page:1,page_size:100}}); const damaged = data.items.filter((item:any) => ['DAMAGED','BROKEN','MISSING_STONE','STONE_DAMAGE','SCRATCHED','DEFECTIVE'].includes(item.condition)).length; setReport({count:data.total_count, items:data.items.length, damaged, refund:data.total_refund}); } catch { setError('Unable to load return reports.'); } }
  useEffect(() => { void load(); }, []);
  return <Page title="Return reports" subtitle="Branch-level return and damage monitoring">{error ? <ErrorState text={error} retry={load} /> : !report ? <EmptyState text="Loading return reports…" /> : <div className="grid grid-cols-3 gap-[13px] max-[760px]:grid-cols-2">{[['Return invoices',report.count],['Returned items',report.items],['Damaged items',report.damaged],['Refund amount',formatMoney(report.refund)]].map(([label,value]) => <article key={label as string} className="rounded-[9px] border border-[#e7e4dc] bg-white p-5"><small className="text-[9px] text-[#82847f]">{label}</small><strong className="mt-[10px] block font-['Cormorant_Garamond'] text-[27px] font-bold">{value}</strong></article>)}</div>}</Page>;
}
