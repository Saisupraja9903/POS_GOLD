import { useEffect, useState } from 'react';
import { CreditCard, Gem, Printer, ScanLine, Search, Trash2, X } from 'lucide-react';
import { api } from '../auth';
import type { JewelleryItem, PriceQuote } from '../types';
import { formatMoney } from '../utils/format';
import '../styles/billing.css';
import { CustomerSelector, SelectedCustomerCard } from '../components/customers/CustomerSelector';
import type { Customer } from '../types/customer';
import { useLocation, useNavigate } from 'react-router-dom';

export function BillingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<JewelleryItem[]>([]);
  const [cart, setCart] = useState<JewelleryItem[]>([]);
  const [quotes, setQuotes] = useState<Record<string, PriceQuote>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [invoice, setInvoice] = useState<any>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);

  useEffect(() => {
    const incoming = location.state as { posItem?: JewelleryItem; posQuote?: PriceQuote } | null;
    if (!incoming?.posItem || !incoming.posQuote) return;
    setCart([incoming.posItem]);
    setQuotes({ [incoming.posItem.id]: incoming.posQuote });
    navigate('/billing', { replace: true, state: null });
  }, [location.state]);

  async function searchInventory() {
    if (!query.trim()) return;
    setError('');
    try {
      const { data } = await api.get('/jewellery', { params: { barcode: query.trim() } });
      setResults(data.filter((item: JewelleryItem) => ['SHOP', 'SHOP_OWNED'].includes(item.ownership)));
    } catch {
      setError('Unable to search branch inventory.');
    }
  }

  async function addToCart(item: JewelleryItem) {
    if (cart.some((entry) => entry.id === item.id)) return;
    setBusy(true);
    try {
      const { data } = await api.post('/sales/quote', { item_id: item.id, tax_rate_percent: '3' });
      setQuotes((current) => ({ ...current, [item.id]: data }));
      setCart((current) => [...current, item]);
      setQuery('');
      setResults([]);
    } catch (reason: any) {
      if (reason.response?.status === 409) {
        setError('This jewellery item is no longer available.');
        const { data } = await api.get('/jewellery', { params: { barcode: item.barcode } });
        setResults(data);
      } else setError(reason.response?.data?.error?.message || 'Unable to price this item.');
    } finally {
      setBusy(false);
    }
  }

  function removeFromCart(itemId: string) {
    setCart((current) => current.filter((item) => item.id !== itemId));
  }

  function clearCart() {
    setCart([]);
    setQuotes({});
  }

  async function completeSale() {
    if (cart.length !== 1) {
      setError('Current checkout supports one serialized jewellery item per invoice.');
      return;
    }
    setBusy(true);
    try {
      const item = cart[0];
      const amount = quotes[item.id].breakdown.total;
      const { data } = await api.post('/sales', {
        item_id: item.id,
        customer_id: customer?.id || null,
        tax_rate_percent: '3',
        payments: [{ method: paymentMethod, amount }],
      });
      setInvoice(data);
      setCheckoutOpen(false);
      clearCart();
    } catch (reason: any) {
      if (reason.response?.status === 409) {
        const unavailable = cart[0];
        setError('This jewellery item is no longer available.');
        clearCart();
        const { data } = await api.get('/jewellery', { params: { barcode: unavailable.barcode } });
        setResults(data);
      } else setError(reason.response?.data?.error?.message || 'Checkout failed. Item availability and payment were not changed.');
    } finally {
      setBusy(false);
    }
  }

  const total = cart.reduce((sum, item) => sum + Number(quotes[item.id]?.breakdown.total || 0), 0);

  if (invoice) {
    return <SaleSuccess invoice={invoice} onNewSale={() => setInvoice(null)} />;
  }

  return (
    <section className="billing">
      <div className="selling">
        <SearchBar query={query} setQuery={setQuery} onSearch={searchInventory} />
        <div className="context"><span><i /> Live branch inventory</span><span>Pricing is calculated and locked by the server</span></div>
        {error && <div className="notice error">{error}</div>}
        <div className="result-head"><div><h2>Product results</h2><p>Only sellable items assigned to this branch are shown.</p></div><b>{results.length} found</b></div>
        <ProductResults items={results} busy={busy} onAdd={addToCart} />
      </div>
      <BillPanel customer={customer} openCustomer={() => setCustomerOpen(true)} removeCustomer={() => setCustomer(null)} cart={cart} quotes={quotes} total={total} onRemove={removeFromCart} onClear={clearCart} onCheckout={() => setCheckoutOpen(true)} />
      {checkoutOpen && <PaymentModal total={total} busy={busy} method={paymentMethod} setMethod={setPaymentMethod} onClose={() => setCheckoutOpen(false)} onConfirm={completeSale} />}
      <CustomerSelector open={customerOpen} onClose={() => setCustomerOpen(false)} onSelect={(selected) => { setCustomer(selected); setCustomerOpen(false); }} />
    </section>
  );
}

function SearchBar({ query, setQuery, onSearch }: { query: string; setQuery: (value: string) => void; onSearch: () => void }) {
  return <div className="scan"><ScanLine /><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSearch()} placeholder="Scan barcode or enter exact tag barcode" /><button onClick={onSearch}><Search /> Search</button>{query && <button className="clear" onClick={() => setQuery('')}><X /></button>}</div>;
}

function ProductResults({ items, busy, onAdd }: { items: JewelleryItem[]; busy: boolean; onAdd: (item: JewelleryItem) => void }) {
  return <div className="product-list">{items.map((item) => { const unavailable = item.available_count === 0 || item.availability_status === 'OUT_OF_STOCK'; return <article key={item.id}><div className="gem"><Gem /></div><div className="product-copy"><small>{item.sku || 'JEWELLERY'}</small><h3>{item.tag_number}</h3><p>{item.barcode}</p></div><div className="weights"><span>GROSS<b>{item.gross_weight} g</b></span><span>NET<b>{item.net_weight} g</b></span><span>FINE<b>{item.fine_weight} g</b></span></div><mark className={unavailable ? 'out-of-stock' : 'available'}>{unavailable ? 'OUT OF STOCK' : 'AVAILABLE'}</mark><button disabled={busy || unavailable} onClick={() => onAdd(item)}>Add to bill</button></article>})}{!items.length && <div className="search-empty"><ScanLine /><h3>Ready to scan</h3><p>Scan a jewellery barcode to validate availability and request authoritative pricing.</p><kbd>Enter</kbd></div>}</div>;
}

function BillPanel({ customer, openCustomer, removeCustomer, cart, quotes, total, onRemove, onClear, onCheckout }: { customer: Customer | null; openCustomer: () => void; removeCustomer: () => void; cart: JewelleryItem[]; quotes: Record<string, PriceQuote>; total: number; onRemove: (id: string) => void; onClear: () => void; onCheckout: () => void }) {
  return <aside className="bill-panel"><SelectedCustomerCard customer={customer} onOpen={openCustomer} onRemove={removeCustomer}/><div className="cart-title"><h2>Bill items</h2><b>{cart.length}</b></div><div className="cart">{cart.map((item) => { const price = quotes[item.id]?.breakdown; return <article key={item.id}><button onClick={() => onRemove(item.id)}><Trash2 /></button><small>{item.tag_number}</small><h3>{item.sku || 'Gold jewellery'}</h3><div><span>{item.net_weight} g net</span><b>{formatMoney(price?.total)}</b></div><dl><dt>Metal</dt><dd>{formatMoney(price?.metal_value)}</dd><dt>Making</dt><dd>{formatMoney(price?.making_charge)}</dd><dt>Tax</dt><dd>{formatMoney(price?.tax_amount)}</dd></dl></article>; })}{!cart.length && <div className="cart-empty"><Gem /><p>No items in this bill</p></div>}</div><div className="bill-total"><p><span>Items</span><b>{cart.length}</b></p><p><span>Backend total</span><b>{formatMoney(total)}</b></p><div><small>GRAND TOTAL</small><strong>{formatMoney(total)}</strong></div><button disabled={!cart.length} onClick={onCheckout}><CreditCard /> Proceed to payment</button><nav><button disabled>Old gold</button><button disabled>Exchange</button><button onClick={onClear}>Clear</button></nav></div></aside>;
}

function PaymentModal({ total, busy, method, setMethod, onClose, onConfirm }: { total: number; busy: boolean; method: string; setMethod: (value: string) => void; onClose: () => void; onConfirm: () => void }) {
  return <div className="modal"><div><button className="modal-x" onClick={onClose}><X /></button><small>SECURE CHECKOUT</small><h2>Collect payment</h2><p>Final price and availability are revalidated atomically by the backend.</p><div className="pay-total"><span>Amount due</span><b>{formatMoney(total)}</b></div><label>Payment method<select value={method} onChange={(e) => setMethod(e.target.value)}><option>CASH</option><option>UPI</option><option>CARD</option><option>BANK_TRANSFER</option></select></label><button disabled={busy} onClick={onConfirm}>{busy ? 'Processing…' : 'Confirm sale'}</button></div></div>;
}

function SaleSuccess({ invoice, onNewSale }: { invoice: any; onNewSale: () => void }) {
  return <section className="success"><div><Gem /><small>SALE COMPLETED</small><h1>{invoice.invoice_number}</h1><p>{formatMoney(invoice.total)} received</p><button onClick={() => window.print()}><Printer /> Print invoice</button><button className="secondary" onClick={onNewSale}>New sale</button></div></section>;
}
