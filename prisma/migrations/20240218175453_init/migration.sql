-- DropForeignKey
ALTER TABLE "Credit" DROP CONSTRAINT "Credit_tenantId_fkey";

-- DropIndex
DROP INDEX "Credit_tenantId_key";

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "creditId" INTEGER;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_creditId_fkey" FOREIGN KEY ("creditId") REFERENCES "Credit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
