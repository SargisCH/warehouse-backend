/*
  Warnings:

  - A unique constraint covering the columns `[taxId]` on the table `Client` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Client_taxId_key" ON "Client"("taxId");
