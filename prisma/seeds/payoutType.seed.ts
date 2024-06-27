import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function main() {
  // Check if the default PayoutType exists
  const tenants = await prisma.tenant.findMany({});
  tenants.forEach(async ({ id: tenantId }) => {
    const defaultPayoutTypeName = 'other';
    const defaultPayoutType = await prisma.payoutType.findUnique({
      where: { name_tenantId: { name: defaultPayoutTypeName, tenantId } },
    });

    // If the default PayoutType doesn't exist, create it
    if (!defaultPayoutType) {
      await prisma.payoutType.create({
        data: {
          name: defaultPayoutTypeName,
          tenant: { connect: { id: tenantId } },
        },
      });
      console.log(`Default PayoutType '${defaultPayoutTypeName}' created.`);
    } else {
      console.log(
        `Default PayoutType '${defaultPayoutTypeName}' already exists.`,
      );
    }
  });
}
