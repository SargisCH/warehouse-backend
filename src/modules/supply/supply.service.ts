import { Injectable, Inject } from '@nestjs/common';
import { CreateSupplyDto, FindAllSuppliesDto } from './supply.dto';
import { SupplyRepository } from 'src/repositories/supply.repository';

@Injectable()
export class SupplyService {
  constructor(
    @Inject(SupplyRepository)
    private supplyRepository: SupplyRepository,
  ) {}

  async create(createSupplyDto: CreateSupplyDto) {
    return this.supplyRepository.create(createSupplyDto);
  }

  async findAll(findAllSuppliesDto: FindAllSuppliesDto) {
    const { page, searchTerm } = findAllSuppliesDto;
    return this.supplyRepository.findAll({ page, searchTerm });
  }
}
