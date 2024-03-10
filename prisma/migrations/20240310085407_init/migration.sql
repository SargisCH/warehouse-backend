/*
  Warnings:

  - You are about to drop the column `managerId` on the `Client` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Client" DROP CONSTRAINT "Client_managerId_fkey";

-- AlterTable
ALTER TABLE "Client" DROP COLUMN "managerId";
