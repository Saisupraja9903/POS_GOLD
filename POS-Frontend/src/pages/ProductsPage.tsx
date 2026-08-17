import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Gem, Minus, Plus, Search, ShoppingBag } from 'lucide-react';
import { api } from '../auth';
import { ErrorState, Page } from '../components/Page';
import type { JewelleryItem } from '../types';
import '../styles/products.css';
import '../styles/quantity.css';

interface PosProduct extends JewelleryItem { product_id: string; name: string; huid?: string; metal: string; metal_code: string; purity: string; fineness: string }
interface ProductResponse { items: PosProduct[]; page: number; page_size: number; total_count: number; total_pages: number; summary: { available_count: number; status: 'AVAILABLE' | 'OUT_OF_STOCK'; total_gross_weight: string; total_fine_weight: string } }
const empty: ProductResponse = { items: [], page: 1, page_size: 20, total_count: 0, total_pages: 1, summary: { available_count: 0, status: 'OUT_OF_STOCK', total_gross_weight: '0', total_fine_weight: '0' } };

export function ProductsPage() {
  const [data, setData] = useState<ProductResponse>(empty); const [query, setQuery] = useState(''); const [page, setPage] = useState(1);
  const [error, setError] = useState(''); const [adding, setAdding] = useState(''); const [inCartIds, setInCartIds] = useState<Set<string>>(new Set());
  const [cartCounts, setCartCounts] = useState<Record<string, number>>({});
  const [selecting, setSelecting] = useState(''); const [quantity, setQuantity] = useState(1); const pendingAdds = useRef(new Set<string>());
  async function loadProducts() { setError(''); try { setData((await api.get('/pos/products', { params: { search: query.trim() || undefined, page, page_size: 20 } })).data); } catch { setError('Unable to load available products.'); } }
  useEffect(() => { const timer = setTimeout(() => void loadProducts(), query ? 350 : 0); return () => clearTimeout(timer); }, [query, page]);
  useEffect(() => { void api.get('/pos/cart/active').then(({ data }) => { const counts = data.lines.reduce((all: Record<string, number>, line: { product_id: string }) => ({ ...all, [line.product_id]: (all[line.product_id] || 0) + 1 }), {}); setCartCounts(counts); setInCartIds(new Set(Object.keys(counts))); }); }, []);
  async function addToBill(item: PosProduct) {
    if (pendingAdds.current.has(item.id)) return; pendingAdds.current.add(item.id); setAdding(item.id); setError('');
    try { await api.post('/pos/cart/products', { product_item_id: item.id, quantity }); setInCartIds(current => new Set(current).add(item.product_id)); setCartCounts(current => ({ ...current, [item.product_id]: (current[item.product_id] || 0) + quantity })); setSelecting(''); setQuantity(1); await loadProducts(); }
    catch (reason: any) { setError(reason.response?.data?.error?.message || 'Unable to add these pieces to billing.'); if ([404, 409].includes(reason.response?.status)) await loadProducts(); }
    finally { pendingAdds.current.delete(item.id); setAdding(''); }
  }
  const first = data.total_count ? (data.page - 1) * data.page_size + 1 : 0; const last = Math.min(data.page * data.page_size, data.total_count);
  return <Page title="Available products" subtitle="Currently sellable jewellery in your branch.">
    <section className="stock-summary"><div><small>AVAILABLE PIECES</small><strong>{data.summary.available_count}</strong><p>Sellable physical items in this branch</p></div><div className="stock-weight"><small>TOTAL AVAILABLE WEIGHT</small><b>{data.summary.total_gross_weight} g</b></div><div className="stock-weight"><small>TOTAL FINE GOLD</small><b>{data.summary.total_fine_weight} g</b></div><mark className={data.summary.status === 'OUT_OF_STOCK' ? 'out-of-stock' : 'available'}>{data.summary.status.replaceAll('_', ' ')}</mark></section>
    <div className="product-tools"><div className="page-search"><Search /><input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="Search product / tag / barcode / HUID" /></div></div>{error && <div className="product-error">{error}</div>}
    {error && !data.items.length ? <ErrorState text={error} retry={loadProducts} /> : data.items.length ? <><div className="available-table"><header><span>PRODUCT</span><span>BARCODE</span><span>PURITY</span><span>GROSS</span><span>NET</span><span>FINE</span><span>WASTAGE</span><span>AVAILABLE STOCK</span><span>ACTION</span></header>
      {data.items.map(item => { const remaining = item.available_count - (cartCounts[item.product_id] || 0); return <article key={item.product_id}><span><b>{item.name}</b><small>{item.sku || item.metal}</small></span><span>{item.barcode}</span><span>{item.purity} / {Number(item.fineness).toFixed(0)}</span><span>{item.gross_weight} g</span><span>{item.net_weight} g</span><span>{item.fine_weight} g</span><span>{item.wastage_percent || '0'}%</span><mark className="available">AVAILABLE<small>{item.available_count} PIECES</small></mark>{selecting === item.product_id ? <div className="quantity-picker"><button aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity(value => value - 1)}><Minus /></button><b>{quantity}</b><button aria-label="Increase quantity" disabled={quantity >= remaining} onClick={() => setQuantity(value => value + 1)}><Plus /></button><button disabled={adding === item.id} onClick={() => void addToBill(item)}><ShoppingBag />{adding === item.id ? 'Adding…' : `Add ${quantity} to Bill`}</button></div> : <button disabled={remaining < 1} onClick={() => { setSelecting(item.product_id); setQuantity(1); }}><ShoppingBag />{remaining < 1 ? 'All in cart' : inCartIds.has(item.product_id) ? 'Add more' : 'Add to Bill'}</button>}</article>; })}</div>
      <footer className="product-pages"><span>Showing {first}–{last} of {data.total_count} products</span><div><button disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft /> Previous</button><b>{page} / {data.total_pages}</b><button disabled={page >= data.total_pages} onClick={() => setPage(page + 1)}>Next <ChevronRight /></button></div></footer></> : <div className="products-empty"><Gem /><h3>{query ? 'No available product found.' : 'No products available'}</h3></div>}
  </Page>;
}
