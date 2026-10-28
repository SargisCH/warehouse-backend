import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ClientGroupListOptions,
  ClientGroupsRepository,
} from 'src/repositories/client_groups.repository';
import { SalesZoneRepository } from 'src/repositories/sales_zone.repository';
import {
  CreateClientGroupDto,
  UpdateClientGroupDto,
} from './client_groups.dto';
import { User } from 'src/drizzle/schema';

@Injectable()
export class ClientGroupsService {
  constructor(
    private readonly clientGroupsRepository: ClientGroupsRepository,
    private readonly salesZoneRepository: SalesZoneRepository,
  ) {}

  // A zone from another tenant must not be attachable.
  private async assertZoneBelongsToTenant(
    salesZoneId: number | null | undefined,
    tenantId: number,
  ) {
    if (salesZoneId === null || salesZoneId === undefined) return;
    const zone = await this.salesZoneRepository.findById(salesZoneId);
    if (!zone || zone.tenantId !== tenantId) {
      throw new BadRequestException('Sales zone not found');
    }
  }

  /**
   * The accumulator must be a group of the same tenant, and following parents
   * up from it must never lead back to this group.
   */
  private async assertParentIsValid(
    parentId: number | null | undefined,
    tenantId: number,
    selfId?: number,
  ) {
    if (parentId === null || parentId === undefined) return;
    let current = await this.clientGroupsRepository.findById(parentId);
    if (!current || current.tenantId !== tenantId) {
      throw new BadRequestException('Accumulator group not found');
    }
    while (current) {
      if (current.id === selfId) {
        throw new BadRequestException(
          'A group cannot accumulate into itself or its own subgroup',
        );
      }
      current = current.parentId
        ? await this.clientGroupsRepository.findById(current.parentId)
        : undefined;
    }
  }

  async create(user: User, createClientGroupDto: CreateClientGroupDto) {
    await this.assertZoneBelongsToTenant(
      createClientGroupDto.salesZoneId,
      user.tenantId,
    );
    await this.assertParentIsValid(
      createClientGroupDto.parentId,
      user.tenantId,
    );
    return this.clientGroupsRepository.create({
      ...createClientGroupDto,
      tenantId: user.tenantId,
    });
  }

  async findAll(user: User, options: ClientGroupListOptions) {
    return this.clientGroupsRepository.findByTenant(user.tenantId, options);
  }

  async findOne(id: number) {
    return this.clientGroupsRepository.findById(id);
  }

  async update(
    user: User,
    id: number,
    updateClientGroupDto: UpdateClientGroupDto,
  ) {
    await this.assertZoneBelongsToTenant(
      updateClientGroupDto.salesZoneId,
      user.tenantId,
    );
    await this.assertParentIsValid(
      updateClientGroupDto.parentId,
      user.tenantId,
      id,
    );
    return this.clientGroupsRepository.update(id, updateClientGroupDto);
  }

  async remove(id: number) {
    const children = await this.clientGroupsRepository.countChildren(id);
    if (children > 0) {
      throw new BadRequestException(
        `Cannot delete a group that ${children} other group(s) accumulate into`,
      );
    }
    return this.clientGroupsRepository.delete(id);
  }
}
