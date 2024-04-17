/*
  Warnings:

  - Added the required column `type` to the `Credit` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Credit" ADD COLUMN     "status" "TransactionStatus" DEFAULT 'PENDING',
ADD COLUMN     "type" "CreditType" NOT NULL;
