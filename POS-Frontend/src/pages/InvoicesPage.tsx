import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Page } from '../components/Page';
import { api } from '../auth';
import { invoiceApi } from '../features/invoices/api';
import { formatMoney } from '../utils/format';
import '../styles/invoices.css';

const paymentMethods = [['CASH', 'Cash'], ['UPI', 'UPI'], ['CARD', 'Card'], ['BANK_TRANSFER', 'Bank Transfer']];
const toPaise = (value: unknown): bigint | null => {
  const source = String(value ?? '').trim().replaceAll(',', '');
  if (!/^\d+(?:\.\d{0,2})?$/.test(source)) return null;
  const [rupees, fraction = ''] = source.split('.');
  return BigInt(rupees) * 100n + BigInt((fraction + '00').slice(0, 2));
};
const paiseAmount = (value: bigint) => `${value / 100n}.${String(value % 100n).padStart(2, '0')}`;
const paiseMoney = (value: bigint) => formatMoney(Number(value) / 100);

export function InvoicesPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [date, setDate] = useState('TODAY');
  const [payment, setPayment] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>({ items: [], total_count: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canPay, setCanPay] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<any>(null);
  function dates() { const now = new Date(), iso = (value: Date) => value.toISOString().slice(0, 10); if (date === 'TODAY') return { date_from: iso(now), date_to: iso(now) }; if (date === 'YESTERDAY') { const value = new Date(now); value.setDate(value.getDate() - 1); return { date_from: iso(value), date_to: iso(value) }; } if (date === 'WEEK') { const value = new Date(now); value.setDate(value.getDate() - 7); return { date_from: iso(value), date_to: iso(now) }; } return {}; }
  async function load() { setLoading(true); setError(''); try { setData((await invoiceApi.list({ search: query || undefined, payment_status: payment || undefined, status: status || undefined, page, page_size: 25, ...dates() })).data); } catch (requestError: any) { setError(requestError.response?.status === 403 ? 'You are not authorized to view invoices.' : requestError.response?.data?.error?.message || 'Unable to load invoices.'); } finally { setLoading(false); } }
  useEffect(() => { void api.get('/auth/me').then(response => setCanPay(response.data.permissions?.includes('*') || response.data.permissions?.includes('billing.payment') || response.data.permissions?.includes('payments.manage'))).catch(() => setCanPay(false)); }, []);
  useEffect(() => { const timer = setTimeout(() => void load(), query ? 400 : 0); return () => clearTimeout(timer); }, [query, date, payment, status, page]);
  return <Page title="Invoices" subtitle="View and reprint completed sales"><div className="invoice-search"><Search /><input autoFocus value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} onKeyDown={event => event.key === 'Escape' && setQuery('')} placeholder="Search invoice, customer, phone, tag or HUID" />{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X /></button>}<button onClick={load}>Search</button></div><div className="invoice-filters"><div>{[['TODAY', 'Today'], ['YESTERDAY', 'Yesterday'], ['WEEK', 'Last 7 days'], ['ALL', 'All']].map(([value, label]) => <button key={value} className={date === value ? 'active' : ''} onClick={() => { setDate(value); setPage(1); }}>{label}</button>)}</div><select value={payment} onChange={event => setPayment(event.target.value)}><option value="">Payment: All</option><option>PAID</option><option>PENDING</option><option>PARTIAL</option></select><select value={status} onChange={event => setStatus(event.target.value)}><option value="">Status: All</option><option>CONFIRMED</option><option>CANCELLED</option></select></div><InvoiceList data={data.items} loading={loading} error={error} query={query} retry={load} canPay={canPay} pay={setPayingInvoice} view={(id: string) => navigate(`/invoices/${id}`)} /><div className="invoice-pages"><span>{data.total_count || 0} invoices</span><div><button disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft /></button><b>{page} / {data.total_pages}</b><button disabled={page >= data.total_pages} onClick={() => setPage(page + 1)}><ChevronRight /></button></div></div>{payingInvoice && <InvoicePaymentModal invoice={payingInvoice} close={() => setPayingInvoice(null)} paid={() => void load()} receipt={() => navigate(`/invoices/${payingInvoice.id}`, { state: { printReceipt: true } })} />}</Page>;
}

function InvoiceList({ data, loading, error, query, retry, view, pay, canPay }: any) {
  if (loading) return <div className="invoice-skeleton">{[1, 2, 3, 4].map(value => <i key={value} />)}</div>;
  if (error) return <div className="invoice-empty error">{error}<button onClick={retry}>Retry</button></div>;
  if (!data.length) return <div className="invoice-empty"><b>No invoices found</b><p>{query ? 'Try another invoice number, customer, phone, tag or HUID.' : 'No completed sales match this date range.'}</p></div>;
  return <div className="invoice-table"><header><span>INVOICE</span><span>CUSTOMER</span><span>ITEMS</span><span>TOTAL</span><span>PAYMENT</span><span>DATE</span><span>STATUS</span><span>ACTION</span></header>{data.map((invoice: any) => { const canCollect = canPay && ['PENDING', 'PARTIAL'].includes(invoice.payment_status); return <article key={invoice.id}><span><b>{invoice.invoice_number}</b><small>{invoice.branch}</small></span><span><b>{invoice.customer?.name || 'Walk-in customer'}</b><small>{invoice.customer?.phone || 'No phone'}</small></span><span>{invoice.item_count}</span><span><b>{formatMoney(invoice.total)}</b></span><mark className={invoice.payment_status.toLowerCase()}>{invoice.payment_status}</mark><span>{new Date(invoice.invoice_date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span><mark>{invoice.status}</mark><span className="invoice-actions"><button onClick={() => view(invoice.id)}>View</button>{canCollect && <button className="pay-now" onClick={() => pay(invoice)}>Pay now</button>}</span></article>; })}</div>;
}

function InvoicePaymentModal({ invoice, close, paid, receipt }: any) {
  const totalPaise = toPaise(invoice.total) ?? 0n;
  const paidPaise = toPaise(invoice.amount_paid || '0') ?? 0n;
  const outstandingPaise = totalPaise > paidPaise ? totalPaise - paidPaise : 0n;
  const [method, setMethod] = useState('UPI');
  const [amount, setAmount] = useState(paiseAmount(outstandingPaise));
  const [confirming, setConfirming] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID ? crypto.randomUUID() : `invoice-${invoice.id}-${Date.now()}`);
  const valuePaise = toPaise(amount);
  function review() { setError(''); if (valuePaise === null || valuePaise <= 0n) { setError('Enter a valid payment amount greater than zero.'); return; } if (valuePaise > outstandingPaise) { setError('Payment cannot exceed the outstanding amount.'); return; } setConfirming(true); }
  async function confirm() { if (valuePaise === null) return; setProcessing(true); setError(''); try { const response = await api.post('/payments', { invoice_id: invoice.id, amount: paiseAmount(valuePaise), method, idempotency_key: idempotencyKey }); setSuccess({ ...response.data, amount: valuePaise, method }); setConfirming(false); paid(); } catch (requestError: any) { const message = requestError.response?.data?.error?.message || 'The payment could not be completed.'; setError(message === 'This invoice has already been paid.' ? 'Payment already completed. This invoice has already been paid.' : message); setConfirming(false); paid(); } finally { setProcessing(false); } }
  if (success) return <div className="invoice-payment-backdrop" role="dialog" aria-modal="true"><section className="invoice-payment-modal success"><small>PAYMENT SUCCESSFUL</small><h2>✓ {paiseMoney(success.amount)}</h2><p>{invoice.invoice_number} · {success.method.replaceAll('_', ' ')}</p><dl><dt>Payment reference</dt><dd>{success.payment_number}</dd><dt>Remaining</dt><dd>{formatMoney(success.outstanding)}</dd><dt>Status</dt><dd>{toPaise(success.outstanding) === 0n ? 'PAID' : 'PARTIAL'}</dd></dl><div><button className="secondary-action" onClick={close}>Close</button><button className="primary-action" onClick={receipt}>View Receipt</button></div></section></div>;
  return <div className="invoice-payment-backdrop" role="dialog" aria-modal="true"><section className="invoice-payment-modal"><button className="payment-close" aria-label="Close payment" onClick={close}><X /></button><small>PAYMENT PROCESSING</small><h2>{invoice.invoice_number}</h2><dl><dt>Customer</dt><dd>{invoice.customer?.name || 'Walk-in customer'}<small>{invoice.customer?.phone || 'No phone recorded'}</small></dd><dt>Invoice total</dt><dd>{formatMoney(invoice.total)}</dd><dt>Amount already paid</dt><dd>{formatMoney(invoice.amount_paid || 0)}</dd><dt>Amount due</dt><dd className="payment-due">{paiseMoney(outstandingPaise)}</dd></dl><h3>Select payment method</h3><div className="invoice-payment-methods">{paymentMethods.map(([methodValue, label]) => <button key={methodValue} className={method === methodValue ? 'active' : ''} onClick={() => setMethod(methodValue)}>{label}</button>)}</div><label>Payment amount<input type="number" min="0.01" max={paiseAmount(outstandingPaise)} step="0.01" value={amount} onChange={event => setAmount(event.target.value)} /></label>{error && <p className="invoice-payment-error">{error}</p>}<div className="invoice-payment-actions"><button className="secondary-action" disabled={processing} onClick={close}>Cancel</button><button className="primary-action" disabled={processing} onClick={review}>{processing ? 'Processing payment…' : 'Confirm payment'}</button></div>{confirming && <div className="invoice-payment-confirm"><small>PAYMENT SUMMARY</small><b>{valuePaise === null ? '—' : paiseMoney(valuePaise)}</b><span>{method.replaceAll('_', ' ')}</span><p>Please confirm that the customer has paid the displayed amount.</p><div><button className="secondary-action" disabled={processing} onClick={() => setConfirming(false)}>Cancel</button><button className="primary-action" disabled={processing} onClick={confirm}>{processing ? 'Processing payment…' : 'Confirm payment'}</button></div></div>}</section></div>;
}
