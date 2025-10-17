import { Inject, Injectable } from '@nestjs/common';
import { UnitDTO } from './unit.dto';
import { UnitRepository } from 'src/repositories/unit.repository';

@Injectable()
export class UnitService {
  constructor(
    @Inject(UnitRepository)
    private unitRepository: UnitRepository,
  ) {}

  async find(where: { name?: string; id?: number }) {
    return this.unitRepository.find(where);
  }

  async findAll() {
    return this.unitRepository.findAll();
  }
}
