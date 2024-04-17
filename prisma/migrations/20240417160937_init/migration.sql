-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "CreditType" AS ENUM ('TO_PAY', 'TO_RECEIVE');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "WeekDay" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'FAILED', 'FINISHED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "companyName" TEXT,
    "role" "Role" DEFAULT 'UNKNOWN',
    "tenantId" INTEGER NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditId" INTEGER,
    "currency" TEXT DEFAULT 'AMD',

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionHistory" (
    "id" SERIAL NOT NULL,
    "transactionType" "TransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "saleId" INTEGER,
    "orderId" INTEGER,
    "clientId" INTEGER,
    "inventorySupplierId" INTEGER,
    "date" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "status" "TransactionStatus" DEFAULT 'PENDING',

    CONSTRAINT "TransactionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credit" (
    "id" SERIAL NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "saleId" INTEGER,
    "inventorySupplierOrderId" INTEGER,
    "currency" TEXT DEFAULT 'AMD',
    "clientId" INTEGER,
    "date" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "type" "CreditType" NOT NULL,
    "status" "TransactionStatus" DEFAULT 'PENDING',

    CONSTRAINT "Credit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "amountUnit" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'AMD',
    "avg" DOUBLE PRECISION DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeCredit" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "customerId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT DEFAULT 'AMD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "priceUnit" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockProduct" (
    "id" SERIAL NOT NULL,
    "inStock" DOUBLE PRECISION NOT NULL,
    "inStockUnit" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ingredient" (
    "productId" INTEGER NOT NULL,
    "inventoryId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "amountUnit" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("productId","inventoryId")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT NOT NULL DEFAULT '',
    "accountNumber" TEXT NOT NULL,
    "legalAddress" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "otherPhoneNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "managerId" INTEGER,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Manager" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Manager_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventorySupplier" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "InventorySupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventorySupplierOrder" (
    "id" SERIAL NOT NULL,
    "inventorySupplierId" INTEGER NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "partialCreditAmount" INTEGER NOT NULL DEFAULT 0,
    "paymentType" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "InventorySupplierOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventorySupplierOrderItem" (
    "id" SERIAL NOT NULL,
    "inventorySupplierOrderId" INTEGER NOT NULL,
    "inventoryId" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "priceUnit" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "amountUnit" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventorySupplierOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "partialCreditAmount" INTEGER NOT NULL DEFAULT 0,
    "paymentType" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" SERIAL NOT NULL,
    "stockProductId" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "priceUnit" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "amountUnit" TEXT NOT NULL,
    "saleId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "inventoryId" INTEGER,
    "clientId" INTEGER,
    "inventorySupplierOrderId" INTEGER,
    "originalPrice" INTEGER,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER,
    "managerId" INTEGER,
    "dayPlan" "WeekDay"[],

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BalanceHistory" (
    "id" SERIAL NOT NULL,
    "direction" "TransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "saleId" INTEGER,
    "orderId" INTEGER,
    "clientId" INTEGER,
    "inventorySupplierId" INTEGER,
    "date" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "status" "TransactionStatus" NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "result" DOUBLE PRECISION NOT NULL,
    "before" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "BalanceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Credit_saleId_key" ON "Credit"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "Credit_inventorySupplierOrderId_key" ON "Credit"("inventorySupplierOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_name_key" ON "Inventory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_name_key" ON "Customer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TradeCredit_name_key" ON "TradeCredit"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TradeCredit_customerId_key" ON "TradeCredit"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_name_key" ON "Product"("name");

-- CreateIndex
CREATE UNIQUE INDEX "StockProduct_productId_key" ON "StockProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_name_key" ON "ProductCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Client_name_key" ON "Client"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Manager_name_key" ON "Manager"("name");

-- CreateIndex
CREATE UNIQUE INDEX "InventorySupplier_name_key" ON "InventorySupplier"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_managerId_clientId_key" ON "Schedule"("managerId", "clientId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_creditId_fkey" FOREIGN KEY ("creditId") REFERENCES "Credit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionHistory" ADD CONSTRAINT "TransactionHistory_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionHistory" ADD CONSTRAINT "TransactionHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "InventorySupplierOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionHistory" ADD CONSTRAINT "TransactionHistory_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionHistory" ADD CONSTRAINT "TransactionHistory_inventorySupplierId_fkey" FOREIGN KEY ("inventorySupplierId") REFERENCES "InventorySupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credit" ADD CONSTRAINT "Credit_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credit" ADD CONSTRAINT "Credit_inventorySupplierOrderId_fkey" FOREIGN KEY ("inventorySupplierOrderId") REFERENCES "InventorySupplierOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credit" ADD CONSTRAINT "Credit_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeCredit" ADD CONSTRAINT "TradeCredit_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockProduct" ADD CONSTRAINT "StockProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Manager"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySupplierOrder" ADD CONSTRAINT "InventorySupplierOrder_inventorySupplierId_fkey" FOREIGN KEY ("inventorySupplierId") REFERENCES "InventorySupplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySupplierOrderItem" ADD CONSTRAINT "InventorySupplierOrderItem_inventorySupplierOrderId_fkey" FOREIGN KEY ("inventorySupplierOrderId") REFERENCES "InventorySupplierOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySupplierOrderItem" ADD CONSTRAINT "InventorySupplierOrderItem_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_stockProductId_fkey" FOREIGN KEY ("stockProductId") REFERENCES "StockProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_inventorySupplierOrderId_fkey" FOREIGN KEY ("inventorySupplierOrderId") REFERENCES "InventorySupplierOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Manager"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceHistory" ADD CONSTRAINT "BalanceHistory_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceHistory" ADD CONSTRAINT "BalanceHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "InventorySupplierOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceHistory" ADD CONSTRAINT "BalanceHistory_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceHistory" ADD CONSTRAINT "BalanceHistory_inventorySupplierId_fkey" FOREIGN KEY ("inventorySupplierId") REFERENCES "InventorySupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceHistory" ADD CONSTRAINT "BalanceHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
