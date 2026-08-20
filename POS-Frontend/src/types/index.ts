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
  wastage_percent?: string | null;
}

export interface PosUser {
  full_name: string;
  email: string;
  employee_id?: string | null;
  business_name: string;
  branch_name: string;
  role: { name: string; code: string };
  permissions: string[];
}

export interface PriceQuote {
  rate_per_gram?: string;
  weight?: { gross: string; stone: string; net_gold: string; fine_gold: string };
  breakdown: {
    metal_value: string;
    making_charge: string;
    wastage_value?: string;
    wastage_charge?: string;
    stone_value?: string;
    discount?: string;
    subtotal?: string;
    tax_amount: string;
    total: string;
  };
}
