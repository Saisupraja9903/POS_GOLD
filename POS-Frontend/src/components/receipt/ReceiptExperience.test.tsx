import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../auth';
import { ReceiptExperience } from './ReceiptExperience';

vi.mock('../../auth', () => ({ api: { get: vi.fn() } }));
const completed = { id: 'invoice-id', invoice_number: 'INV-0000042', total: '54155.75', invoice_date: '2026-08-14T17:24:00Z' };
const detail = { ...completed, branch: 'Main Branch', salesperson_id: 'SP-001', amount_paid: '54155.75', balance: '0.00', customer: { name: 'Anita Rao', phone: '9876500002' }, items: [{ id: 'product-id', name: 'Gold Necklace', tag_number: 'G-00125', barcode: '890000000004', huid: 'HUID12345', gross_weight: '23.800', stone_weight: '0.300', net_weight: '23.500', fine_weight: '21.526', line_total: '54155.75', price: { metal_value: '48000', making_charge: '3000', wastage_value: '1500', subtotal: '52500', tax_amount: '1655.75' } }], payments: [{ method: 'CASH', amount: '20000' }, { method: 'UPI', amount: '34155.75', reference: 'UPI-42' }] };
function success(value: any = detail) { vi.mocked(api.get).mockImplementation((url: string) => Promise.resolve({ data: url === '/auth/me' ? { business_name: 'Aurum Jewellers' } : value } as any)); }

describe('post-checkout receipt experience', () => {
  beforeEach(() => { vi.clearAllMocks(); success(); vi.stubGlobal('print', vi.fn()); });
  afterEach(() => cleanup());
  it('shows completion, invoice, total, loading and customer data', async () => {
    render(<ReceiptExperience invoice={completed} onNewSale={vi.fn()} />);
    expect(screen.getByText('SALE COMPLETED')).toBeInTheDocument(); expect(screen.getByText('INV-0000042')).toBeInTheDocument(); expect(screen.getByText(/54,155\.75/)).toBeInTheDocument(); expect(screen.getByText('Preparing invoice…')).toBeInTheDocument(); expect(await screen.findByText('Anita Rao')).toBeInTheDocument(); expect(screen.getByText('9876500002')).toBeInTheDocument();
  });
  it('opens the invoice with jewellery weights and multiple payments', async () => {
    render(<ReceiptExperience invoice={completed} onNewSale={vi.fn()} />); fireEvent.click(await screen.findByRole('button', { name: /view receipt/i }));
    expect(screen.getByRole('dialog', { name: 'Invoice Preview' })).toBeInTheDocument(); expect(screen.getByText('Aurum Jewellers')).toBeInTheDocument(); expect(screen.getByText('Gold Necklace')).toBeInTheDocument(); expect(screen.getByText('HUID · HUID12345')).toBeInTheDocument(); expect(screen.getByText('23.800 g')).toBeInTheDocument(); expect(screen.getByText('21.526 g')).toBeInTheDocument(); expect(screen.getByText('CASH')).toBeInTheDocument(); expect(screen.getByText('UPI · UPI-42')).toBeInTheDocument();
  });
  it('prints only explicitly and keeps New Sale behavior', async () => {
    const newSale = vi.fn(); render(<ReceiptExperience invoice={completed} onNewSale={newSale} />); expect(window.print).not.toHaveBeenCalled(); fireEvent.click(await screen.findByRole('button', { name: /view receipt/i })); fireEvent.click(screen.getAllByRole('button', { name: /print invoice/i }).at(-1)!); expect(window.print).toHaveBeenCalledOnce(); fireEvent.click(screen.getAllByRole('button', { name: /new sale/i })[0]); expect(newSale).toHaveBeenCalledOnce();
  });
  it('omits missing customer fields and supports safe retry', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('offline')); render(<ReceiptExperience invoice={completed} onNewSale={vi.fn()} />); expect(await screen.findByText('Unable to load invoice details.')).toBeInTheDocument(); success({ ...detail, customer: null }); fireEvent.click(screen.getByRole('button', { name: /retry/i })); await waitFor(() => expect(screen.getByRole('button', { name: /view receipt/i })).toBeEnabled()); expect(screen.queryByText('Customer')).not.toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: /view receipt/i })); expect(screen.queryByText('BILLED TO')).not.toBeInTheDocument();
  });
});
