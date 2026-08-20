import { useEffect, useState } from 'react';
import { Check, Eye, Printer, RefreshCw, X } from 'lucide-react';
import { api } from '../../auth';
import { formatMoney } from '../../utils/format';
import { InvoiceDocument, isInvoicePrintable } from './InvoiceDocument';
import '../../styles/receipt.css';

export function ReceiptExperience({ invoice, onNewSale }: { invoice: any; onNewSale: () => void }) {
  const [detail, setDetail] = useState<any>(null), [business, setBusiness] = useState<any>(null), [previewOpen, setPreviewOpen] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState('');
  async function loadReceipt() { setLoading(true); setError(''); try { const [inv, me] = await Promise.all([api.get(`/pos/invoices/${invoice.id}`), api.get('/auth/me')]); if (!inv.data) throw new Error(); setDetail(inv.data); setBusiness(me.data); } catch { setError('Unable to load invoice details.'); } finally { setLoading(false); } }
  useEffect(() => { void loadReceipt(); }, [invoice.id]);
  const shown = detail || invoice, date = shown.invoice_date ? new Date(shown.invoice_date) : null;
  return <section className="sale-complete-screen"><div className="sale-complete-card"><span className="success-check"><Check /></span><small>SALE COMPLETED</small><h1>{shown.invoice_number}</h1><strong>{formatMoney(shown.total)}</strong><p>Payment received successfully</p>{detail && <dl className="sale-facts">{detail.customer && <><dt>Customer</dt><dd>{detail.customer.name}<small>{detail.customer.phone}</small></dd></>}<dt>Branch</dt><dd>{detail.branch}</dd>{(detail.salesperson_name || detail.salesperson_id) && <><dt>Sales person</dt><dd>{detail.salesperson_name || detail.salesperson_id}</dd></>}{date && <><dt>Date</dt><dd>{date.toLocaleDateString('en-IN', { dateStyle: 'medium' })}<small>{date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</small></dd></>}</dl>}{error && <div className="receipt-error">{error}<button onClick={loadReceipt}><RefreshCw /> Retry</button></div>}{loading && <div className="receipt-loading">Preparing invoice…</div>}<div className="complete-actions"><button disabled={loading || !!error} onClick={() => setPreviewOpen(true)}><Eye /> View Receipt</button><button disabled={loading || !!error} onClick={() => setPreviewOpen(true)}><Printer /> Print Invoice</button><button className="new-sale-button" onClick={onNewSale}>New Sale</button></div></div>{previewOpen && detail && <ReceiptPreview invoice={detail} business={business} close={() => setPreviewOpen(false)} newSale={onNewSale} />}</section>;
}

function ReceiptPreview({ invoice, business, close, newSale }: { invoice: any; business: any; close: () => void; newSale: () => void }) {
  const [printError, setPrintError] = useState('');
  function print() { const root = document.querySelector(`.invoice-print-document[data-invoice-id="${invoice.id}"]`); if (!isInvoicePrintable(invoice) || !root) { setPrintError('Invoice is not ready for printing.'); return; } setPrintError(''); try { window.print(); } catch { setPrintError('Unable to prepare invoice for printing.'); } }
  return <div className="receipt-modal" role="dialog" aria-modal="true" aria-label="Invoice Preview"><header className="receipt-controls"><div><small>COMPLETED TRANSACTION</small><h2>Invoice Preview</h2></div><nav><button className="print-button" onClick={print}><Printer /> Print Invoice</button><button className="new-sale-button" onClick={newSale}>New Sale</button><button className="close-button" onClick={close}><X /> Close</button></nav></header>{printError && <div className="print-error">{printError}</div>}<main className="receipt-stage"><InvoiceDocument invoice={invoice} business={business} /></main></div>;
}
