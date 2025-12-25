import { Injectable } from '@nestjs/common';
import { SupplierRepository } from 'src/repositories/supplier.repository';
import { CreateSupplierDto, UpdateSupplierDto } from './supplier.dto';
import { User } from 'src/drizzle/schema';

@Injectable()
export class SupplierService {
  constructor(private readonly supplierRepository: SupplierRepository) {}

  async create(user: User, createSupplierDto: CreateSupplierDto) {
    return this.supplierRepository.create({
      ...createSupplierDto,
      tenantId: user.tenantId,
    });
  }

  async findAll(user: User) {
    return this.supplierRepository.findByTenant(user.tenantId);
  }

  async findOne(id: number) {
    return this.supplierRepository.findById(id);
  }

  async update(id: number, updateSupplierDto: UpdateSupplierDto) {
    return this.supplierRepository.update(id, updateSupplierDto);
  }

  async remove(id: number) {
    return this.supplierRepository.delete(id);
  }
}
