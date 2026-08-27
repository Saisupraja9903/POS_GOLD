import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page } from '../components/Page';
import { api } from '../auth';
import '../styles/gold-exchange.css';

const verificationKeys = ['gross_weight', 'stone_weight', 'net_weight', 'purity', 'rate', 'value'] as const;
const verificationLabels = ['Weight verified', 'Stone / non-gold weight verified', 'Net gold weight verified', 'Purity verified', 'Buyback rate reviewed', 'Valuation verified'];
const money = (value: unknown) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));
const weight = (value: unknown) => `${Number(value || 0).toFixed(3)} g`;
const amount = (value: unknown) => Number(value || 0);
const statusLabel = (status: string) => status.replaceAll('_', ' ');

export function GoldExchangePage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [purities, setPurities] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [customer, setCustomer] = useState('');
  const [code, setCode] = useState('');
  const [lookupItem, setLookupItem] = useState<any>(null);
  const [oldGold, setOldGold] = useState({ description: 'Old gold jewellery', gross_weight: '', stone_weight: '0', purity_id: '' });
  const [step, setStep] = useState<'ENTRY' | 'VERIFY' | 'APPROVED'>('ENTRY');
  const [verification, setVerification] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [invoice, setInvoice] = useState<any>(null);

  useEffect(() => {
    Promise.all([api.get('/pos/customers', { params: { page_size: 50 } }), api.get('/purities')])
      .then(([customerResponse, purityResponse]) => {
        setCustomers(customerResponse.data.items || []);
        setPurities(purityResponse.data || []);
      })
      .catch(() => setError('Unable to load exchange data.'));
  }, []);

  async function lookUpItem() {
    setError('');
    try {
      const response = await api.get('/pos/items/lookup', { params: { code: code.trim(), include_unavailable: true } });
      setLookupItem(response.data);
    } catch (requestError: any) {
      setLookupItem(null);
      setError(requestError.response?.data?.error?.message || 'Unable to check this jewellery item.');
    }
  }

  async function addItemToExchange() {
    if (!lookupItem) return;
    setError('');
    try {
      const response = await api.get('/pos/items/lookup', { params: { code: lookupItem.barcode || lookupItem.huid || lookupItem.tag_number, include_unavailable: true } });
      setLookupItem(response.data);
      if (!response.data.selectable) return;
      setItems(current => current.some(item => item.id === response.data.id) ? current : [...current, { ...response.data, selected: true }]);
      setCode('');
      setLookupItem(null);
    } catch (requestError: any) {
      setError(requestError.response?.data?.error?.message || 'This jewellery item is no longer available.');
    }
  }

  async function completeExchange() {
    setBusy(true);
    setError('');
    try {
      const response = await api.post('/pos/exchanges', {
        customer_id: customer, description: oldGold.description, gross_weight: +oldGold.gross_weight, stone_weight: +oldGold.stone_weight,
        purity_id: oldGold.purity_id, new_item_ids: selectedItems.map(item => item.id), payments: [], verification,
      });
      setResult(response.data);
      try { setInvoice((await api.get(`/pos/invoices/${response.data.invoice_id}`)).data); } catch { /* Settlement still renders from the authoritative exchange response. */ }
    } catch (requestError: any) {
      setError(requestError.response?.data?.error?.message || 'Gold Exchange could not be completed. Review the details and retry.');
    } finally { setBusy(false); }
  }

  function startNewExchange() {
    setItems([]); setCustomer(''); setCode(''); setLookupItem(null); setOldGold({ description: 'Old gold jewellery', gross_weight: '', stone_weight: '0', purity_id: '' });
    setStep('ENTRY'); setVerification({}); setError(''); setResult(null); setInvoice(null);
  }

  const selectedItems = items.filter(item => item.selected);
  const selectedCustomer = customers.find(item => item.id === customer);
  const selectedPurity = purities.find(item => item.id === oldGold.purity_id);
  const isVerified = verificationKeys.every(key => verification[key]);
  const canContinue = customer && oldGold.gross_weight && oldGold.purity_id && selectedItems.length;

  if (result) return <CompletedExchange result={result} invoice={invoice} customer={selectedCustomer} oldGold={oldGold} purity={selectedPurity} items={selectedItems} onNew={startNewExchange} onInvoice={() => navigate(`/invoices/${result.invoice_id}`)} onPrint={() => navigate(`/invoices/${result.invoice_id}`, { state: { printReceipt: true } })} onPaymentCompleted={async (payment: any) => { setResult((current: any) => ({ ...current, status: payment.exchange_status, balance: payment.outstanding, refund_due: '0' })); try { setInvoice((await api.get(`/pos/invoices/${result.invoice_id}`)).data); } catch { /* The settlement response remains authoritative. */ } }} />;

  return <Page title="Gold Exchange" subtitle="Enter details, review, verify, then complete."><div className="gold-exchange"><header className="exchange-header"><div><small>GOLD EXCHANGE</small><h2>{step === 'ENTRY' ? 'Enter exchange details' : step === 'VERIFY' ? 'Verify & approve exchange' : 'Gold exchange approved'}</h2><p>Customer → Old Gold → New Jewellery → Confirm → Verify → Approve → Complete</p></div><span className="exchange-status">{step}</span></header><div className="grid gap-4 xl:grid-cols-[1.5fr_.8fr]"><main className="grid gap-4">
    {step === 'ENTRY' && <><section className="exchange-card"><small>CUSTOMER</small><select value={customer} onChange={event => setCustomer(event.target.value)}><option value="">Select customer</option>{customers.map(item => <option key={item.id} value={item.id}>{item.name} · {item.phone}</option>)}</select></section><section className="exchange-card old-gold-card"><small>OLD GOLD / JEWELLERY</small><div className="mt-3 grid gap-3 md:grid-cols-2"><input value={oldGold.description} onChange={event => setOldGold({ ...oldGold, description: event.target.value })} /><input type="number" placeholder="Gross weight (g)" value={oldGold.gross_weight} onChange={event => setOldGold({ ...oldGold, gross_weight: event.target.value })} /><input type="number" placeholder="Stone weight (g)" value={oldGold.stone_weight} onChange={event => setOldGold({ ...oldGold, stone_weight: event.target.value })} /><select value={oldGold.purity_id} onChange={event => setOldGold({ ...oldGold, purity_id: event.target.value })}><option value="">Tested purity</option>{purities.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div></section><section className="exchange-card new-jewellery-card"><small>NEW JEWELLERY</small><div className="exchange-scan"><input value={code} onChange={event => setCode(event.target.value)} onKeyDown={event => event.key === 'Enter' && void lookUpItem()} placeholder="Scan barcode, tag or HUID" /><button disabled={!code.trim()} onClick={lookUpItem}>Check item</button></div>{lookupItem && <article className={`exchange-lookup ${lookupItem.selectable ? 'available' : 'unavailable'}`}><div><small>{lookupItem.availability_status}</small><b>{lookupItem.name || lookupItem.sku}</b><span>Tag · {lookupItem.tag_number} · {lookupItem.purity} · {weight(lookupItem.net_weight)}</span><span>{lookupItem.selectable ? '✓ Available for Exchange' : lookupItem.availability_message}</span></div><button disabled={!lookupItem.selectable || items.some(item => item.id === lookupItem.id)} onClick={addItemToExchange}>{items.some(item => item.id === lookupItem.id) ? 'Added' : lookupItem.selectable ? 'Add to Exchange' : 'Unavailable'}</button></article>}{items.map(item => <label className="exchange-item" key={item.id}><span>{item.name || item.sku}<small>{item.tag_number} · {item.net_weight} g</small></span><input type="checkbox" checked={item.selected} onChange={event => setItems(current => current.map(row => row.id === item.id ? { ...row, selected: event.target.checked } : row))} /></label>)}</section><button disabled={!canContinue} onClick={() => setStep('VERIFY')}>Confirm Exchange Details</button></>}
    {step === 'VERIFY' && <section className="exchange-card"><small>VERIFY & APPROVE GOLD EXCHANGE</small><h2>{oldGold.description}</h2><p>Gross {oldGold.gross_weight} g · Stone {oldGold.stone_weight} g · {selectedItems.length} new item(s)</p>{verificationKeys.map((key, index) => <label className="exchange-item" key={key}><span>{verificationLabels[index]}</span><input type="checkbox" checked={!!verification[key]} onChange={event => setVerification({ ...verification, [key]: event.target.checked })} /></label>)}<button disabled={!isVerified} onClick={() => setStep('APPROVED')}>Approve Exchange</button><button className="plain-action" onClick={() => setStep('ENTRY')}>Edit details</button></section>}
    {step === 'APPROVED' && <section className="exchange-card approved-review"><small>EXCHANGE APPROVED</small><h2>Ready for final recording</h2><p>{oldGold.description} · {weight(oldGold.gross_weight)} gross · {selectedItems.length} new jewellery item{selectedItems.length === 1 ? '' : 's'}</p><div className="approval-checks">{['Weight verified', 'Purity verified', 'Valuation verified', 'Sales approval recorded'].map(item => <span key={item}>✓ {item}</span>)}</div><button className="plain-action" onClick={() => { setStep('ENTRY'); setVerification({}); }}>Edit & re-verify</button></section>}
  </main><aside className="exchange-summary"><small>EXCHANGE SUMMARY</small><h2>{step === 'APPROVED' ? 'Ready to complete' : 'Details review'}</h2><p>New jewellery selected: <b>{selectedItems.length}</b></p>{error && <p className="exchange-error">{error}</p>}{step === 'APPROVED' && <button disabled={busy} onClick={completeExchange}>{busy ? 'Completing…' : 'Complete Gold Exchange'}</button>}</aside></div></div></Page>;
}

function CompletedExchange({ result, invoice, customer, oldGold, purity, items, onNew, onInvoice, onPrint, onPaymentCompleted }: any) {
  const status = result.status || 'COMPLETED';
  const refundDue = amount(result.refund_due || (amount(result.balance) < 0 ? -amount(result.balance) : 0));
  const balanceDue = Math.max(0, amount(result.balance));
  const settled = balanceDue === 0 && refundDue === 0;
  const snapshot = invoice?.snapshot?.price || {};
  const tax = invoice?.snapshot?.tax || result.tax || {};
  const netGold = Math.max(0, amount(oldGold.gross_weight) - amount(oldGold.stone_weight));
  const completedAt = invoice?.invoice_date ? new Date(invoice.invoice_date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  const currentStatus = status === 'REFUND_PENDING' ? 'REFUND PENDING' : status === 'PAYMENT_PENDING' ? 'PAYMENT PENDING' : settled ? 'COMPLETED' : statusLabel(status);
  const heroTitle = currentStatus === 'REFUND PENDING' ? 'Gold exchange recorded' : currentStatus === 'PAYMENT PENDING' ? 'Gold exchange awaiting payment' : 'Gold exchange completed';
  const displayItems = invoice?.items || items;
  return <Page title="Gold Exchange" subtitle={`Exchange No. ${result.exchange_number}`}><div className="gold-exchange exchange-completed">
    <header className="exchange-header"><div><small>GOLD EXCHANGE</small><h2>{result.exchange_number}</h2><p>{currentStatus === 'REFUND PENDING' ? 'The exchange is recorded, but the customer refund is still pending.' : currentStatus === 'PAYMENT PENDING' ? 'The exchange is recorded and awaits the remaining payment.' : 'Exchange completed successfully.'}</p></div><span className={`exchange-status ${currentStatus.toLowerCase().replaceAll(' ', '-')}`}>{currentStatus}</span></header>
    <section className="exchange-success-hero"><span className="success-seal">✓</span><div><small>{currentStatus}</small><h1>{heroTitle}</h1><p>{currentStatus === 'REFUND PENDING' ? 'Complete the authorised refund to settle this exchange.' : currentStatus === 'PAYMENT PENDING' ? 'Collect the remaining amount through the authorised payment workflow.' : 'The customer’s old gold was received and the new jewellery exchange was recorded.'}</p></div><dl><dt>Approved by</dt><dd>{invoice?.salesperson_name || 'Sales Person'}</dd><dt>Approved at</dt><dd>{completedAt}</dd></dl></section>
    <section className="exchange-top-summary"><SummaryTile label="Old gold" value={weight(netGold)} note={purity?.label || 'Tested purity'} /><span>↓</span><SummaryTile label="Exchange credit" value={money(result.exchange_credit)} /><span>↓</span><SummaryTile label="New jewellery" value={money(result.new_total)} /><span>↓</span><SummaryTile label={refundDue ? 'Refund due' : balanceDue ? 'Balance payable' : 'Settlement'} value={refundDue ? money(refundDue) : balanceDue ? money(balanceDue) : 'Fully settled'} emphasis /></section>
    <section className="exchange-customer-card"><small>CUSTOMER</small><div><b>{invoice?.customer?.name || customer?.name || 'Customer'}</b><span>{invoice?.customer?.phone || customer?.phone || 'Phone not recorded'}</span><span>Customer ID · {invoice?.customer?.id || customer?.id || '—'}</span></div></section>
    <div className="exchange-completion-grid"><main className="grid gap-4"><section className="completion-card old-gold-details"><small>WHAT THE CUSTOMER GAVE</small><h2>Old Gold</h2><h3>{oldGold.description}</h3><div className="fact-grid"><Fact label="Gross weight" value={weight(oldGold.gross_weight)} /><Fact label="Stone / non-gold" value={weight(oldGold.stone_weight)} /><Fact label="Net weight" value={weight(netGold)} /><Fact label="Purity" value={purity?.label || 'Tested purity'} /></div><div className="credit-strip"><span>Exchange credit</span><b>{money(result.exchange_credit)}</b></div></section>
      <section className="completion-card new-jewellery-details"><small>WHAT THE CUSTOMER RECEIVED</small><h2>New Jewellery</h2>{displayItems.map((item: any) => <article className="completion-item" key={item.id}><div><b>{item.name || item.sku || 'Gold jewellery'}</b><small>Tag · {item.tag_number || '—'}{item.huid ? ` · HUID ${item.huid}` : ''}</small></div><strong>{money(item.line_total || item.price?.total || 0)}</strong><div className="item-facts"><span>Gross <b>{weight(item.gross_weight)}</b></span><span>Stone <b>{weight(item.stone_weight)}</b></span><span>Net <b>{weight(item.net_weight)}</b></span><span>Fine <b>{weight(item.fine_weight)}</b></span>{item.price?.negotiated_pricing?.making_charge != null && <span>Making <b>{money(item.price.negotiated_pricing.making_charge)}</b></span>}{item.price?.negotiated_pricing?.stone_charge != null && <span>Stone value <b>{money(item.price.negotiated_pricing.stone_charge)}</b></span>}</div></article>)}</section>
      <section className="completion-card inventory-result"><small>EXCHANGE INVENTORY</small><div><b>Old gold</b><span>Received · Exchange In</span><em>{result.exchange_number}</em></div><div><b>New jewellery</b><span>Sold · Exchange Out</span><em>{items.map((item: any) => item.tag_number).filter(Boolean).join(', ') || 'Serialised items'}</em></div></section></main>
      <aside className="completion-side"><section className="completion-card settlement-card"><small>SETTLEMENT</small><Fact label="Taxable value" value={money(tax.taxable_value)} />{tax.gst_rate_percent != null && <Fact label={`GST @ ${tax.gst_rate_percent}%`} value={money(tax.total_gst)} />}{tax.tax_type === 'INTER_STATE' ? <Fact label={`IGST${tax.gst_rate_percent != null ? ` @ ${tax.gst_rate_percent}%` : ''}`} value={money(tax.igst)} /> : <><Fact label={`CGST${tax.gst_rate_percent != null ? ` @ ${amount(tax.gst_rate_percent) / 2}%` : ''}`} value={money(tax.cgst)} /><Fact label={`SGST${tax.gst_rate_percent != null ? ` @ ${amount(tax.gst_rate_percent) / 2}%` : ''}`} value={money(tax.sgst)} /><Fact label="Total GST" value={money(tax.total_gst)} /></>}<Fact label="New jewellery total" value={money(result.new_total)} /><Fact label="Exchange credit" value={`−${money(result.exchange_credit)}`} /><Fact label="Approved discount" value={amount(snapshot.discount) ? `−${money(snapshot.discount)}` : '—'} /><hr />{refundDue ? <><small>REFUND DUE</small><strong className="settlement-total warning">{money(refundDue)}</strong><p>The exchange is recorded, but this amount is still due to the customer.</p></> : balanceDue ? <><small>BALANCE PAYABLE</small><strong className="settlement-total">{money(balanceDue)}</strong><p>Collect the remaining amount through the normal payment workflow.</p></> : <><small>SETTLEMENT</small><strong className="settlement-total success">Fully settled</strong><p>✓ Payment complete</p></>}</section>
        {(refundDue || balanceDue) && <section className={`completion-card settlement-notice ${refundDue ? 'refund' : 'payment'}`}><small>{refundDue ? 'REFUND PENDING' : 'PAYMENT PENDING'}</small><b>{refundDue ? `${money(refundDue)} is due to the customer.` : `${money(balanceDue)} remains payable.`}</b><p>{refundDue ? 'Use the authorised refund workflow to complete the settlement.' : 'Use the standard payment workflow to complete the settlement.'}</p></section>}
        {balanceDue > 0 && <ExchangePayment exchange={result} outstanding={balanceDue} onCompleted={onPaymentCompleted} />}
        <section className="completion-card approval-result"><small>VERIFICATION & APPROVAL</small>{['Weight verified', 'Purity verified', 'Valuation verified', 'Exchange approved'].map(item => <span key={item}>✓ {item}</span>)}<dl><dt>Approved by</dt><dd>{invoice?.salesperson_name || 'Sales Person'}</dd><dt>Approved at</dt><dd>{completedAt}</dd></dl></section>
        <section className="completion-card documents-card"><small>DOCUMENTS</small><Fact label="Invoice" value={result.invoice_number || '—'} /><Fact label="Exchange" value={result.exchange_number} /><Fact label="Payment" value={invoice?.payments?.length ? invoice.payments.map((payment: any) => payment.reference || payment.method).join(', ') : 'Pending / not recorded'} /></section></aside>
    </div>
    <footer className="exchange-action-bar"><button className="primary-action" onClick={onInvoice}>View Invoice</button><button className="secondary-action" onClick={onPrint}>Print Receipt</button><button className="secondary-action" onClick={onNew}>New Gold Exchange</button>{refundDue > 0 && <button className="secondary-action" onClick={onInvoice}>View Refund Workflow</button>}</footer>
  </div></Page>;
}

function SummaryTile({ label, value, note, emphasis }: any) { return <div className={emphasis ? 'summary-tile emphasis' : 'summary-tile'}><small>{label}</small><b>{value}</b>{note && <span>{note}</span>}</div>; }
function Fact({ label, value }: any) { return <div className="fact"><span>{label}</span><b>{value}</b></div>; }

function ExchangePayment({ exchange, outstanding, onCompleted }: any) {
  const [method, setMethod] = useState('UPI');
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [received, setReceived] = useState<any>(null);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const due = outstanding;
  function beginPayment() {
    setError('');
    if (!Number.isFinite(due) || due <= 0) { setError('There is no payable balance to collect.'); return; }
    setIdempotencyKey(current => current || (crypto.randomUUID ? crypto.randomUUID() : `exchange-${exchange.id}-${Date.now()}`));
    setConfirming(true);
  }
  async function confirmPayment() {
    setSubmitting(true); setError('');
    try {
      const response = await api.post(`/pos/exchanges/${exchange.id}/payments`, { invoice_id: exchange.invoice_id, amount: due, method, idempotency_key: idempotencyKey });
      setReceived({ ...response.data, amount: due, method }); setConfirming(false); setIdempotencyKey(''); await onCompleted(response.data);
    } catch (requestError: any) { setError(requestError.response?.data?.error?.message || 'The payment could not be completed. Please try again.'); setConfirming(false); }
    finally { setSubmitting(false); }
  }
  if (received) return <section className="completion-card exchange-payment received"><small>PAYMENT RECEIVED</small><b>{money(received.amount)}</b><span>{received.method.replaceAll('_', ' ')}</span><span>{received.payment_number}</span><mark>PAID</mark></section>;
  return <section className="completion-card exchange-payment"><small>PAYMENT</small><div className="payment-methods">{[['CASH', 'Cash'], ['UPI', 'UPI'], ['CARD', 'Card'], ['BANK_TRANSFER', 'Bank Transfer']].map(([value, label]) => <button className={method === value ? 'active' : ''} key={value} onClick={() => setMethod(value)}>{label}</button>)}</div><label>Amount<input type="text" readOnly value={money(outstanding)} /></label>{error && <p className="payment-error">{error}</p>}<button className="payment-submit" disabled={submitting} onClick={beginPayment}>Proceed to Payment</button>{confirming && <div className="payment-confirm-backdrop" role="dialog" aria-modal="true"><section><small>CONFIRM PAYMENT</small><h3>{money(due)}</h3><p>{method.replaceAll('_', ' ')}</p><span>Please confirm that the customer has paid the displayed amount.</span><div><button className="secondary-action" disabled={submitting} onClick={() => setConfirming(false)}>Back</button><button className="primary-action" disabled={submitting} onClick={confirmPayment}>{submitting ? 'Processing…' : 'Confirm Payment'}</button></div></section></div>}</section>;
}
