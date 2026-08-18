import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Gem, Search } from 'lucide-react';
import { api } from '../auth';
import { ErrorState, Page } from '../components/Page';
import type { JewelleryItem } from '../types';
import '../styles/products.css';

interface Product extends JewelleryItem { product_id: string; name: string; metal: string; purity: string; fineness: string }
interface Response { items: Product[]; page: number; page_size: number; total_count: number; total_pages: number; summary: { available_count: number; status: string; total_gross_weight: string; total_fine_weight: string } }
const empty: Response = { items: [], page: 1, page_size: 20, total_count: 0, total_pages: 1, summary: { available_count: 0, status: 'OUT_OF_STOCK', total_gross_weight: '0', total_fine_weight: '0' } };

export function BranchProductsPage() {
  const [data, setData] = useState<Response>(empty); const [query, setQuery] = useState(''); const [page, setPage] = useState(1); const [error, setError] = useState('');
  async function load() { setError(''); try { setData((await api.get('/pos/products', { params: { search: query.trim() || undefined, page, page_size: 20 } })).data); } catch { setError('Unable to load branch stock.'); } }
  useEffect(() => { const timer = setTimeout(() => void load(), query ? 350 : 0); return () => clearTimeout(timer); }, [query, page]);
  return <div className="branch-products-font"><Page title="Products & stock" subtitle="Read-only branch jewellery availability">
    <section className="stock-summary"><div><small>AVAILABLE PIECES</small><strong>{data.summary.available_count}</strong><p>Sellable physical items in this branch</p></div><div className="stock-weight"><small>TOTAL AVAILABLE WEIGHT</small><b>{data.summary.total_gross_weight} g</b></div><div className="stock-weight"><small>TOTAL FINE GOLD</small><b>{data.summary.total_fine_weight} g</b></div><mark className={data.summary.status === 'OUT_OF_STOCK' ? 'out-of-stock' : 'available'}>{data.summary.status.replaceAll('_', ' ')}</mark></section>
    <div className="product-tools"><div className="page-search"><Search /><input value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Search product / tag / barcode / HUID" /></div></div>
    {error ? <ErrorState text={error} retry={load} /> : data.items.length ? <><div className="available-table"><header><span>PRODUCT</span><span>BARCODE</span><span>PURITY</span><span>GROSS</span><span>NET</span><span>FINE</span><span>WASTAGE</span><span>AVAILABLE STOCK</span></header>{data.items.map(item => <article key={item.id}><span><b>{item.name}</b><small>{item.sku || item.metal}</small></span><span>{item.barcode}</span><span>{item.purity} / {Number(item.fineness).toFixed(0)}</span><span>{item.gross_weight} g</span><span>{item.net_weight} g</span><span>{item.fine_weight} g</span><span>{item.wastage_percent == null ? 'Not configured' : `${item.wastage_percent}%`}</span><mark className="available">{item.availability_status.replaceAll('_', ' ')}<small>{item.available_count} PIECES</small></mark></article>)}</div><footer className="product-pages"><span>{data.total_count} products</span><div><button disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft /> Previous</button><b>{page} / {data.total_pages}</b><button disabled={page >= data.total_pages} onClick={() => setPage(page + 1)}>Next <ChevronRight /></button></div></footer></> : <div className="products-empty"><Gem /><h3>No products available</h3></div>}
  </Page></div>;
}
