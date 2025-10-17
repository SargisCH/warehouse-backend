export enum PaymentTypeEnum {
  CASH = 'CASH',
  CREDIT = 'CREDIT',
  TRANSFER = 'TRANSFER',
  PARTIAL_CREDIT = 'PARTIAL CREDIT',
}
export type InventorySupplierOrderDTO = {
  orderDate: Date;
  status: string;
  paymentType: PaymentTypeEnum;
  partialCreditAmount?: number;
  orderItems: Array<{
    inventoryId: number;
    amount: number;
    amountUnit: string;
    price: number;
    priceUnit: string;
  }>;
};
