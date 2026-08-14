import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Gem, Search, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../auth';
import { ErrorState, Page } from '../components/Page';
import type { JewelleryItem, PriceQuote } from '../types';
import '../styles/products.css';

interface PosProduct extends JewelleryItem {
  product_id: string;
  name: string;
  huid?: string;
  metal: string;
  metal_code: string;
  purity: string;
  fineness: string;
}

interface ProductResponse {
  items: PosProduct[];
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  summary: { available_count: number; status: 'AVAILABLE' | 'OUT_OF_STOCK'; total_gross_weight: string; total_fine_weight: string };
}

const empty: ProductResponse = { items: [], page: 1, page_size: 20, total_count: 0, total_pages: 1, summary: { available_count: 0, status: 'OUT_OF_STOCK', total_gross_weight: '0', total_fine_weight: '0' } };

export function ProductsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<ProductResponse>(empty);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState('');

  async function loadProducts() {
    setError('');
    try {
      const response = await api.get('/pos/products', { params: { search: query.trim() || undefined, page, page_size: 20 } });
      setData(response.data);
    } catch { setError('Unable to load available products.'); }
  }

  useEffect(() => {
    const timer = setTimeout(() => void loadProducts(), query ? 350 : 0);
    return () => clearTimeout(timer);
  }, [query, page]);

  async function addToBill(item: PosProduct) {
    setAdding(item.id);
    setError('');
    try {
      const quote = (await api.post<PriceQuote>('/sales/quote', { item_id: item.id, tax_rate_percent: '3' })).data;
      navigate('/billing', { state: { posItem: item, posQuote: quote } });
    } catch (reason: any) {
      if (reason.response?.status === 409 || reason.response?.status === 404) {
        setError('This item is no longer available.');
        await loadProducts();
      } else setError(reason.response?.data?.error?.message || 'Unable to add this item to billing.');
    } finally { setAdding(''); }
  }

  const first = data.total_count ? (data.page - 1) * data.page_size + 1 : 0;
  const last = Math.min(data.page * data.page_size, data.total_count);

  return <Page title="Available products" subtitle="Currently sellable jewellery in your branch.">
    <section className="stock-summary">
      <div><small>AVAILABLE PRODUCTS</small><strong>{data.summary.available_count}</strong><p>Sellable physical items in this branch</p></div>
      <div className="stock-weight"><small>TOTAL AVAILABLE WEIGHT</small><b>{data.summary.total_gross_weight} g</b></div>
      <div className="stock-weight"><small>TOTAL FINE GOLD</small><b>{data.summary.total_fine_weight} g</b></div>
      <mark className={data.summary.status === 'OUT_OF_STOCK' ? 'out-of-stock' : 'available'}>{data.summary.status.replaceAll('_', ' ')}</mark>
    </section>
    <div className="product-tools"><div className="page-search"><Search /><input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="Search product / tag / barcode / HUID" /></div></div>
    {error && <div className="product-error">{error}</div>}
    {error && !data.items.length ? <ErrorState text={error} retry={loadProducts} /> : data.items.length ? <>
      <div className="available-table">
        <header><span>PRODUCT</span><span>PRODUCT ID</span><span>TAG</span><span>BARCODE</span><span>HUID</span><span>PURITY</span><span>GROSS</span><span>NET</span><span>FINE</span><span>STATUS</span><span>ACTION</span></header>
        {data.items.map(item => <article key={item.id}><span><b>{item.name}</b><small>{item.metal}</small></span><span className="product-id" title={item.product_id}>{item.product_id}</span><span>{item.tag_number}</span><span>{item.barcode}</span><span>{item.huid || '—'}</span><span>{item.purity} / {Number(item.fineness).toFixed(0)}</span><span>{item.gross_weight} g</span><span>{item.net_weight} g</span><span>{item.fine_weight} g</span><mark className="available">AVAILABLE</mark><button disabled={adding === item.id} onClick={() => addToBill(item)}><ShoppingBag />{adding === item.id ? 'Checking…' : 'Add to Bill'}</button></article>)}
      </div>
      <footer className="product-pages"><span>Showing {first}–{last} of {data.total_count} available items</span><div><button disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft /> Previous</button><b>{page} / {data.total_pages}</b><button disabled={page >= data.total_pages} onClick={() => setPage(page + 1)}>Next <ChevronRight /></button></div></footer>
    </> : <div className="products-empty"><Gem /><h3>{query ? 'No available item found.' : 'No products available'}</h3><p>{query ? 'No currently sellable item matches this search.' : 'There are currently no sellable items in this branch.'}</p></div>}
  </Page>;
}
