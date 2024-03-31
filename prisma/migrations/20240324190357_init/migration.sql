-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'FAILED', 'FINISHED');

-- AlterTable
ALTER TABLE "TransactionHistory" ADD COLUMN     "status" "TransactionStatus" DEFAULT 'PENDING';
