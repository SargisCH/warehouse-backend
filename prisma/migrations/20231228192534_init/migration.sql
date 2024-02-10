/*
  Warnings:

  - Added the required column `clientId` to the `Credit` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Credit" ADD COLUMN     "clientId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Credit" ADD CONSTRAINT "Credit_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
