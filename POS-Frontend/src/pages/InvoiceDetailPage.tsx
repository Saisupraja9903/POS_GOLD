import { useEffect, useState } from 'react';
import { ArrowLeft, Printer, RefreshCw, RotateCcw, Share2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../auth';
import { InvoiceDocument, isInvoicePrintable } from '../components/receipt/InvoiceDocument';
import { formatMoney } from '../utils/format';
import '../styles/invoices.css';
import '../styles/receipt.css';

export function InvoiceDetailPage() {
  const { id } = useParams(), navigate = useNavigate();
  const [invoice, setInvoice] = useState<any>(null), [business, setBusiness] = useState<any>(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [printError, setPrintError] = useState('');
  async function load() { if (!id) return; setLoading(true); setError(''); try { const [inv, me] = await Promise.all([api.get(`/pos/invoices/${id}`), api.get('/auth/me')]); if (!inv.data) throw new Error(); setInvoice(inv.data); setBusiness(me.data); } catch { setError('Unable to load invoice.'); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, [id]);
  function print() { const root = invoice && document.querySelector(`.invoice-print-document[data-invoice-id="${invoice.id}"]`); if (!isInvoicePrintable(invoice) || !root) { setPrintError('Invoice is not ready for printing.'); return; } setPrintError(''); try { window.print(); } catch { setPrintError('Unable to prepare invoice for printing.'); } }
  async function share() { const text = `Invoice ${invoice.invoice_number} · ${formatMoney(invoice.total)}`; if (navigator.share) await navigator.share({ title: invoice.invoice_number, text }); else await navigator.clipboard.writeText(text); }
  if (loading) return <div className="invoice-detail-state">Loading invoice...</div>;
  if (error) return <div className="invoice-detail-state">{error}<button onClick={load}><RefreshCw /> Retry</button><button onClick={() => navigate('/invoices')}>Back to invoices</button></div>;
  return <section className="invoice-view-screen"><header className="invoice-view-actions no-print"><button onClick={() => navigate('/invoices')}><ArrowLeft /> Invoices</button><div><button onClick={print}><Printer /> Print Invoice</button><button onClick={share}><Share2 /> Share</button><button onClick={() => navigate(`/returns?invoice=${encodeURIComponent(invoice.invoice_number)}`)}><RotateCcw /> Start Return</button></div></header>{printError && <div className="print-error no-print">{printError}</div>}<main className="invoice-view-stage"><InvoiceDocument invoice={invoice} business={business} /></main></section>;
}
