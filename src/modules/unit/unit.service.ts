import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { UnitDTO } from './unit.dto';
import { UnitRepository } from 'src/repositories/unit.repository';

@Injectable()
export class UnitService {
  constructor(
    @Inject(UnitRepository)
    private unitRepository: UnitRepository,
  ) {}

  async create(user: { role?: string }, dto: UnitDTO) {
    if (!['Admin', 'Super Admin'].includes(user.role)) {
      throw new ForbiddenException();
    }
    return this.unitRepository.create(dto.name);
  }

  async find(where: { name?: string; id?: number }) {
    return this.unitRepository.find(where);
  }

  async findAll() {
    return this.unitRepository.findAll();
  }
}
