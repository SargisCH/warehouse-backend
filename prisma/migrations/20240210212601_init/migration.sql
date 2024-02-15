/*
  Warnings:

  - You are about to drop the column `creditId` on the `User` table. All the data in the column will be lost.
  - Added the required column `clientId` to the `Credit` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_creditId_fkey";

-- AlterTable
ALTER TABLE "Credit" ADD COLUMN     "clientId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "creditId";

-- AddForeignKey
ALTER TABLE "Credit" ADD CONSTRAINT "Credit_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
