jest.mock('src/repositories/client.repository', () => ({
  ClientRepository: class {},
}));
jest.mock('src/repositories/client_groups.repository', () => ({
  ClientGroupsRepository: class {},
}));
jest.mock('src/repositories/manager.repository', () => ({
  ManagerRepository: class {},
}));
jest.mock('src/repositories/sales_zone.repository', () => ({
  SalesZoneRepository: class {},
}));
jest.mock('src/repositories/price_list.repository', () => ({
  PriceListRepository: class {},
}));

import 'reflect-metadata';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClientService } from './client.service';
import { SalesZoneService } from '../sales_zone/sales_zone.service';
import { ManagerService } from '../manager/manager.service';

const user = { tenantId: 1 } as any;

function setup(kind: 'buyer' | 'zone') {
  const records = {
    nextCode: jest.fn().mockResolvedValue('000001'),
    findById: jest.fn().mockResolvedValue({ id: 5, tenantId: 1 }),
    create: jest.fn().mockImplementation(async (data) => data),
    update: jest.fn().mockImplementation(async (id, data) => data),
  };
  const managers = {
    findById: jest.fn().mockResolvedValue({ id: 9, tenantId: 1 }),
  };
  const service =
    kind === 'buyer'
      ? new ClientService(
          records as any,
          {} as any,
          {} as any,
          managers as any,
          {} as any,
        )
      : new SalesZoneService(
          records as any,
          {} as any,
          managers as any,
          {} as any,
        );
  return { records, managers, service };
}

describe.each(['buyer', 'zone'] as const)(
  'deliverer assignment to %s',
  (kind) => {
    it('saves a same-tenant deliverer on creation', async () => {
      const { service, records } = setup(kind);
      await service.create(user, { name: 'Example', delivererId: 9 } as any);
      expect(records.create).toHaveBeenCalledWith(
        expect.objectContaining({ delivererId: 9, tenantId: 1 }),
      );
    });

    it('can change and clear a saved assignment', async () => {
      const { service, records } = setup(kind);
      await service.update(user, 5, { delivererId: 9 });
      expect(records.update).toHaveBeenLastCalledWith(5, { delivererId: 9 });
      await service.update(user, 5, { delivererId: null });
      expect(records.update).toHaveBeenLastCalledWith(5, { delivererId: null });
    });

    it.each([undefined, { id: 9, tenantId: 2 }])(
      'rejects a missing or foreign deliverer',
      async (deliverer) => {
        const { service, records, managers } = setup(kind);
        managers.findById.mockResolvedValue(deliverer);
        await expect(
          service.create(user, { name: 'Example', delivererId: 9 } as any),
        ).rejects.toBeInstanceOf(BadRequestException);
        await expect(
          service.update(user, 5, { delivererId: 9 }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(records.create).not.toHaveBeenCalled();
        expect(records.update).not.toHaveBeenCalled();
      },
    );

    it('rejects changes to another tenant’s record', async () => {
      const { service, records } = setup(kind);
      records.findById.mockResolvedValue({ id: 5, tenantId: 2 });
      await expect(
        service.update(user, 5, { delivererId: 9 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(records.update).not.toHaveBeenCalled();
    });

    it('does not require a deliverer and leaves an omitted assignment untouched', async () => {
      const { service, managers, records } = setup(kind);
      await service.update(user, 5, { name: 'Renamed' });
      expect(managers.findById).not.toHaveBeenCalled();
      expect(records.update).toHaveBeenCalledWith(5, { name: 'Renamed' });
    });
  },
);

it('rejects updating another tenant’s manager assignment', async () => {
  const records = {
    findById: jest.fn().mockResolvedValue({ id: 5, tenantId: 2 }),
    update: jest.fn(),
  };
  const service = new ManagerService(records as any, {} as any, {} as any);
  await expect(
    service.update(user, 5, { delivererId: 9 }),
  ).rejects.toBeInstanceOf(NotFoundException);
  expect(records.update).not.toHaveBeenCalled();
});
