jest.mock('src/repositories/unit.repository', () => ({
  UnitRepository: class {},
}));

import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UnitService } from './unit.service';
import { UnitDTO } from './unit.dto';
import { UnitRepository } from 'src/repositories/unit.repository';

describe('unit creation', () => {
  const repository = { create: jest.fn() };
  const service = new UnitService(repository as unknown as UnitRepository);

  beforeEach(() => jest.clearAllMocks());

  it.each(['Admin', 'Super Admin'])(
    'allows %s to create a unit',
    async (role) => {
      repository.create.mockResolvedValue({ id: 12, name: 'կգ' });
      await expect(service.create({ role }, { name: 'կգ' })).resolves.toEqual({
        id: 12,
        name: 'կգ',
      });
      expect(repository.create).toHaveBeenCalledWith('կգ');
    },
  );

  it.each(['Manager', 'Deliverer', undefined])(
    'rejects unauthorized role %s before writing',
    async (role) => {
      await expect(
        service.create({ role }, { name: 'կգ' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.create).not.toHaveBeenCalled();
    },
  );

  it('trims names and accepts Armenian labels', async () => {
    const dto = plainToInstance(UnitDTO, { name: '  հատ  ' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.name).toBe('հատ');
  });

  it.each(['', '   ', 'x'.repeat(101), 12, null])(
    'rejects invalid name %p',
    async (name) => {
      expect(
        (await validate(plainToInstance(UnitDTO, { name }))).length,
      ).toBeGreaterThan(0);
    },
  );
});
