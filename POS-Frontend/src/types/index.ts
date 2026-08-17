export interface JewelleryItem {
  id: string;
  tag_number: string;
  barcode: string;
  sku?: string;
  gross_weight: string;
  stone_weight: string;
  net_weight: string;
  fine_weight: string;
  status: string;
  available_count: number;
  availability_status: 'AVAILABLE' | 'OUT_OF_STOCK';
  ownership: string;
  product_id?: string;
  name?: string;
  huid?: string;
  purity?: string;
  fineness?: string;
  wastage_percent?: string;
}

export interface PosUser {
  full_name: string;
  email: string;
  business_name: string;
  branch_name: string;
  role: { name: string };
}

export interface PriceQuote {
  breakdown: {
    metal_value: string;
    making_charge: string;
    wastage_value?: string;
    tax_amount: string;
    total: string;
  };
}
