import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductsPage } from './ProductsPage';
import { api } from '../auth';

vi.mock('../auth', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

const product = { id: 'item-a', product_id: 'product-a', name: 'Gold Ring', sku: 'RING', tag_number: 'TAG-A', barcode: 'BAR-A', gross_weight: '10', stone_weight: '0', net_weight: '10', fine_weight: '9.16', status: 'AVAILABLE', available_count: 1, availability_status: 'AVAILABLE', ownership: 'SHOP_OWNED', metal: 'Gold', metal_code: 'AU', purity: '22K', fineness: '916' };
const products = { items: [product], page: 1, page_size: 20, total_count: 1, total_pages: 1, summary: { available_count: 1, status: 'AVAILABLE', total_gross_weight: '10', total_fine_weight: '9.16' } };

describe('ProductsPage add to bill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => Promise.resolve({ data: url === '/pos/cart/active' ? { lines: [] } : products } as any));
    vi.mocked(api.post).mockResolvedValue({ data: { item_count: 1, lines: [{ item_id: product.id }] } } as any);
  });

  it('sends exactly one cart mutation for one click', async () => {
    render(<ProductsPage />);
    const button = await screen.findByRole('button', { name: /add to bill/i });
    fireEvent.click(button);
    fireEvent.click(await screen.findByRole('button', { name: /add 1 to bill/i }));
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post).toHaveBeenCalledWith('/pos/cart/products', { product_item_id: 'item-a', quantity: 1 });
  });

  it('shows only the final POS columns and authoritative piece count', async () => {
    render(<ProductsPage />);
    expect(await screen.findByText('PRODUCT')).toBeInTheDocument();
    expect(screen.queryByText('PRODUCT ID')).not.toBeInTheDocument();
    expect(screen.queryByText(/^TAG$/)).not.toBeInTheDocument();
    for (const heading of ['BARCODE', 'PURITY', 'GROSS', 'NET', 'FINE', 'WASTAGE', 'AVAILABLE STOCK', 'ACTION']) expect(screen.getByText(heading)).toBeInTheDocument();
    expect(screen.getByText('1 PIECES')).toBeInTheDocument();
  });
});
