-- CreateTable
CREATE TABLE "Client" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "companyCode" TEXT NOT NULL,
    "companyType" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "bankAccountNumber" TEXT NOT NULL,
    "legalAddress" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "otherPhoneNumber" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_companyCode_key" ON "Client"("companyCode");
