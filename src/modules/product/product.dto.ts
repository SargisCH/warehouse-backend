export interface StockProductDTO {
  id: number;
  productId: number;
  inStock?: number;
  inStockUnit: string;
  noCalculation?: boolean;
}
