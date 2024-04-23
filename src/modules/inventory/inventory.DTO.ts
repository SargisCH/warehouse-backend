import {
  Inventory,
  InventoryEntryItem as InventoryEntryItemModel,
} from '@prisma/client';

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

export interface InventoryModelResponse extends Inventory {
  avg?: number;
  InventoryEntryHistoryItem?: InventoryEntryItemModel[];
  amount?: number;
}
