-- DropForeignKey
ALTER TABLE "Credit" DROP CONSTRAINT "Credit_clientId_fkey";

-- AlterTable
ALTER TABLE "Credit" ALTER COLUMN "clientId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Credit" ADD CONSTRAINT "Credit_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
