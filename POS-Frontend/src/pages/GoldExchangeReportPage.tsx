import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Landmark, Scale, UserRound, UsersRound, X } from 'lucide-react';
import { api } from '../auth';
import { EmptyState, ErrorState, Page } from '../components/Page';
import { formatMoney } from '../utils/format';

const words = (value: unknown) => String(value || '—').replaceAll('_', ' ');
const date = (value: unknown) => value ? new Date(String(value)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export function GoldExchangeReportPage() {
  const [data, setData] = useState<any>();
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<any>();
  async function load() { setError(''); try { setData((await api.get('/pos/exchanges/report', { params: { page: 1, page_size: 100 } })).data); } catch (reason: any) { setError(reason.response?.data?.error?.message || 'Unable to load Gold Exchange history.'); } }
  useEffect(() => { void load(); }, []);
  return <Page title="Gold Exchange Report" subtitle="Branch exchange history · View only"><div className="gold-exchange gold-exchange-report">
    <header className="exchange-header"><div><small>GOLD EXCHANGE · REPORT / HISTORY</small><h2>Branch exchange history</h2><p>Review customer exchanges and settlement outcomes in one read-only report.</p></div><span className="exchange-status">VIEW ONLY</span></header>
    {error ? <ErrorState text={error} retry={load}/> : !data ? <EmptyState text="Loading Gold Exchange history…"/> : <section className="completion-card exchange-report-list">
      <div className="report-list-heading"><div><small>TRANSACTION REGISTER</small><h3>Gold exchange transactions</h3></div><span>{data.items.length} records</span></div>
      <div className="available-table mt-3"><header><span>EXCHANGE</span><span>DATE</span><span>CUSTOMER / ACTOR</span><span>AGREED VALUE</span><span>SETTLEMENT</span><span>STATUS</span></header>
        {data.items.map((row: any) => <article key={row.id}><span><b>{row.exchange_number}</b><small>{row.branch}</small></span><span>{date(row.created_at)}</span><span><b>{row.customer.name}</b><small>{row.salesperson}</small></span><span className="report-money">{formatMoney(row.agreed_exchange_value)}</span><span>{words(row.payment_direction)}<small>{formatMoney(row.settlement_amount)}</small></span><span><button className="report-view-action" onClick={() => setSelected(row)}><StatusBadge status={row.status}/><em>View</em></button></span></article>)}
        {!data.items.length && <p className="report-empty">No Gold Exchange records found in this branch.</p>}
      </div>
    </section>}
    {selected && <ExchangeReportModal exchange={selected} close={() => setSelected(undefined)}/>}
  </div></Page>;
}

function ExchangeReportModal({ exchange, close }: { exchange: any; close: () => void }) {
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeButton.current?.focus(); const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); }; document.addEventListener('keydown', escape); return () => document.removeEventListener('keydown', escape); }, [close]);
  return <div className="exchange-report-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}><section className="exchange-report-modal" role="dialog" aria-modal="true" aria-labelledby="exchange-report-title">
    <header className="report-modal-header"><div><small>GOLD EXCHANGE</small><h2 id="exchange-report-title">{exchange.exchange_number}</h2><p>Gold Exchange Transaction</p><span><CalendarDays/> {date(exchange.created_at)} <i>·</i> <Landmark/> {exchange.branch || '—'}</span></div><StatusBadge status={exchange.status}/><button ref={closeButton} className="report-modal-x" aria-label="Close Gold Exchange report" onClick={close}><X/></button></header>
    <div className="report-modal-body">
      <section className="report-identity-grid" aria-label="Transaction summary"><ReportIdentity icon={<UsersRound/>} label="Customer" value={exchange.customer?.name} detail={exchange.customer?.phone}/><ReportIdentity icon={<UserRound/>} label="Sales Person / Actor" value={exchange.salesperson}/><ReportIdentity icon={<Landmark/>} label="Branch" value={exchange.branch}/><ReportIdentity icon={<CalendarDays/>} label="Exchange Reference" value={exchange.exchange_number}/></section>
      <div className="report-details-grid"><main>
        <section className="report-section old-gold-report"><SectionTitle title="Old Gold" subtitle="Customer exchange asset"/><div className="report-fact-grid"><ReportFact label="Description" value={exchange.old_gold?.description}/><ReportFact label="Net Weight" value={`${exchange.old_gold?.net_weight ?? '—'} g`} prominent/><ReportFact label="Calculated Value" value={formatMoney(exchange.calculated_gold_value)}/><ReportFact label="Agreed Exchange Value" value={formatMoney(exchange.agreed_exchange_value)} prominent/></div></section>
        <section className="report-section new-jewellery-report"><SectionTitle title="New Jewellery" subtitle="Transaction consideration"/>{Array.isArray(exchange.new_items) && exchange.new_items.length > 0 && <div className="report-item-list">{exchange.new_items.map((item: any, index: number) => <div key={item.id || index}><span>{item.name || item.sku || item.tag_number || 'Jewellery item'}</span>{item.line_total != null && <b>{formatMoney(item.line_total)}</b>}</div>)}</div>}<div className="new-jewellery-total"><span>New Jewellery Total</span><strong>{formatMoney(exchange.new_jewellery_total)}</strong></div></section>
      </main><aside>
        <section className="report-section settlement-report"><SectionTitle title="Settlement" subtitle="Financial summary"/><dl><dt>New Jewellery Total</dt><dd>{formatMoney(exchange.new_jewellery_total)}</dd><dt>Agreed Old Gold Value</dt><dd>− {formatMoney(exchange.agreed_exchange_value)}</dd></dl><div className="settlement-report-total"><span>Settlement Amount</span><strong>{formatMoney(exchange.settlement_amount)}</strong><em>{words(exchange.payment_direction || 'BALANCED')}</em></div></section>
        <section className="report-section report-status-section"><SectionTitle title="Transaction Status" subtitle="Current recorded state"/><div className="status-event"><i/><div><StatusBadge status={exchange.status}/><small>Recorded {date(exchange.created_at)}</small></div></div></section>
      </aside></div>
    </div>
    <footer className="report-modal-footer"><span><Scale/> Read-only transaction report</span><button className="primary-action" onClick={close}>Close</button></footer>
  </section></div>;
}

function StatusBadge({ status }: { status: unknown }) { const value = String(status || 'UNKNOWN'); return <span className={`report-status-badge status-${value.toLowerCase().replaceAll('_', '-')}`}><i/>{words(value)}</span>; }
function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) { return <header className="report-section-title"><div><small>{title}</small><span>{subtitle}</span></div></header>; }
function ReportIdentity({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: any; detail?: any }) { return <div className="report-identity"><i>{icon}</i><div><small>{label}</small><b>{value || '—'}</b>{detail && <span>{detail}</span>}</div></div>; }
function ReportFact({ label, value, prominent = false }: { label: string; value: any; prominent?: boolean }) { return <div className={prominent ? 'prominent' : ''}><small>{label}</small><strong>{value ?? '—'}</strong></div>; }
