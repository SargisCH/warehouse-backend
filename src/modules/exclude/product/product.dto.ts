import { Product } from '@prisma/client';

export interface StockProductDTO {
  id?: number;
  productId: number;
  inStock?: number;
  inStockUnit: string;
  noCalculation?: boolean;
}

export interface ProductResponseItem extends Product {
  inStock: number;
  inStockUnit: string;
  costPrice?: number;
}
