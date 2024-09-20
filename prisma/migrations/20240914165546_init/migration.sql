-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "confirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "disposed" BOOLEAN NOT NULL DEFAULT false;
