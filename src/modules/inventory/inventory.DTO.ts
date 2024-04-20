export type InventoryEntry = {
  date?: Date;
  inventoryEntryItems: Array<InventoryEntryItem>;
  inventorySupplierId?: number;
};

export type InventoryEntryItem = {
  id?: number;
  inventoryId: number;
  amount: number;
  amountUnit: string;
  price: number;
};
