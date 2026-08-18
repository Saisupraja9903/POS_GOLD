import { useEffect, useState } from 'react';
import { api } from '../auth';
import { EmptyState, ErrorState } from './Page';
import { formatMoney } from '../utils/format';

const periods = [['TODAY','Today'],['YESTERDAY','Yesterday'],['LAST_WEEK','Last 7 Days'],['LAST_MONTH','Last Month'],['ALL','All']] as const;
export function PeriodSummary() {
  const [period,setPeriod] = useState('TODAY'); const [summary,setSummary] = useState<any>(); const [error,setError] = useState('');
  async function load() { setError(''); setSummary(undefined); try { setSummary((await api.get('/pos/dashboard/summary',{params:{period}})).data); } catch { setError('Unable to load the selected period.'); } }
  useEffect(() => { void load(); }, [period]);
  const selected = periods.find(([value]) => value === period)?.[1] ?? 'Selected period';
  const cards = summary ? [[`${selected} revenue`,formatMoney(summary.revenue)],[`${selected} bills`,summary.bills],['Jewellery pieces sold',summary.pieces],['Gross gold weight',`${summary.gross_weight} g`],['Stone weight',`${summary.stone_weight} g`],['Net gold weight',`${summary.net_weight} g`],['Fine gold weight',`${summary.fine_weight} g`]] : [];
  return <><div className="invoice-filters mb-[18px]"><div>{periods.map(([value,label]) => <button key={value} className={period===value?'active':''} onClick={() => setPeriod(value)}>{label}</button>)}</div></div>{error ? <ErrorState text={error} retry={load} /> : !summary ? <EmptyState text="Loading period totals…" /> : <div className="grid grid-cols-3 gap-[13px] max-[760px]:grid-cols-2">{cards.map(([label,value]) => <article key={label} className="rounded-[9px] border border-[#e7e4dc] bg-white p-5"><small className="text-[9px] text-[#82847f]">{label}</small><strong className="mt-[10px] block text-[27px] font-bold">{value}</strong></article>)}</div>}</>;
}
