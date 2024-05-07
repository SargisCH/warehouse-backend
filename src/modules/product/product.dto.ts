import { Product } from '@prisma/client';

export interface StockProductDTO {
  id?: number;
  productId: number;
  inStock?: number;
  inStockUnit: string;
  noCalculation?: boolean;
}
export interface CreateProductDto extends Product {
  inStock: number;
  inStockUnit: string;
}

export interface ProductResponseItem extends Product {
  inStock: number;
  inStockUnit: string;
  costPrice?: number;
}
