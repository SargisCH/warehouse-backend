import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SalesZoneRepository } from 'src/repositories/sales_zone.repository';
import { ClientGroupsRepository } from 'src/repositories/client_groups.repository';
import { ManagerRepository } from 'src/repositories/manager.repository';
import { ClientRepository } from 'src/repositories/client.repository';
import { CreateSalesZoneDto, UpdateSalesZoneDto } from './sales_zone.dto';
import { User } from 'src/drizzle/schema';
import { SalesZoneListOptions } from 'src/repositories/sales_zone.repository';

// Postgres unique_violation - see the same note in manager.service.ts.
const UNIQUE_VIOLATION = '23505';
const CODE_RETRIES = 5;

@Injectable()
export class SalesZoneService {
  constructor(
    private readonly salesZoneRepository: SalesZoneRepository,
    private readonly clientGroupsRepository: ClientGroupsRepository,
    private readonly managerRepository: ManagerRepository,
    private readonly clientRepository: ClientRepository,
  ) {}

  // A manager from another tenant must not be attachable.
  private async assertManagerBelongsToTenant(
    managerId: number | null | undefined,
    tenantId: number,
  ) {
    if (managerId === null || managerId === undefined) return;
    const manager = await this.managerRepository.findById(managerId);
    if (!manager || manager.tenantId !== tenantId) {
      throw new BadRequestException('Manager not found');
    }
  }

  /**
   * «Կուտակիչ» must be another zone of the same tenant, and - when editing an
   * existing zone - must not already sit below it, which would close a loop.
   */
  private async assertParentIsAttachable(
    parentId: number | null | undefined,
    tenantId: number,
    zoneId?: number,
  ) {
    if (parentId === null || parentId === undefined) return;

    const parent = await this.salesZoneRepository.findById(parentId);
    if (!parent || parent.tenantId !== tenantId) {
      throw new BadRequestException('Accumulator sales zone not found');
    }

    if (zoneId === undefined) return;

    if (parentId === zoneId) {
      throw new BadRequestException(
        'A sales zone cannot be its own accumulator',
      );
    }

    const ancestors = await this.salesZoneRepository.ancestorIds(parentId);
    if (ancestors.includes(zoneId)) {
      throw new BadRequestException(
        'That sales zone already nests under this one',
      );
    }
  }

  async create(user: User, createSalesZoneDto: CreateSalesZoneDto) {
    await this.assertManagerBelongsToTenant(
      createSalesZoneDto.managerId,
      user.tenantId,
    );
    await this.assertParentIsAttachable(
      createSalesZoneDto.parentId,
      user.tenantId,
    );

    for (let attempt = 0; attempt < CODE_RETRIES; attempt++) {
      const code = await this.salesZoneRepository.nextCode(user.tenantId);
      try {
        return await this.salesZoneRepository.create({
          ...createSalesZoneDto,
          code,
          tenantId: user.tenantId,
        });
      } catch (e) {
        const isDuplicateCode =
          (e?.cause?.code ?? e?.code) === UNIQUE_VIOLATION &&
          String(e?.cause?.constraint ?? e?.constraint) ===
            'sales_zones_tenant_code';
        if (!isDuplicateCode || attempt === CODE_RETRIES - 1) throw e;
      }
    }
  }

  async findAll(user: User, options: SalesZoneListOptions) {
    return this.salesZoneRepository.findByTenant(user.tenantId, options);
  }

  async findOne(id: number) {
    const zone = await this.salesZoneRepository.findById(id);
    if (!zone) {
      throw new NotFoundException('Sales zone not found');
    }
    return zone;
  }

  async update(user: User, id: number, updateSalesZoneDto: UpdateSalesZoneDto) {
    await this.findOne(id);
    await this.assertManagerBelongsToTenant(
      updateSalesZoneDto.managerId,
      user.tenantId,
    );
    await this.assertParentIsAttachable(
      updateSalesZoneDto.parentId,
      user.tenantId,
      id,
    );
    return this.salesZoneRepository.update(id, updateSalesZoneDto);
  }

  async remove(id: number) {
    await this.findOne(id);
    // The FKs are ON DELETE NO ACTION, so a zone still in use would fail with a
    // raw constraint error. Answer with something the UI can show instead.
    const groupCount = await this.clientGroupsRepository.countByZone(id);
    if (groupCount > 0) {
      throw new BadRequestException(
        `Sales zone is attached to ${groupCount} client group(s) and cannot be deleted`,
      );
    }
    const managerCount = await this.managerRepository.countByZone(id);
    if (managerCount > 0) {
      throw new BadRequestException(
        `Sales zone is attached to ${managerCount} manager(s) and cannot be deleted`,
      );
    }
    const clientCount = await this.clientRepository.countByZone(id);
    if (clientCount > 0) {
      throw new BadRequestException(
        `Sales zone is attached to ${clientCount} buyer(s) and cannot be deleted`,
      );
    }
    const childCount = await this.salesZoneRepository.countByParent(id);
    if (childCount > 0) {
      throw new BadRequestException(
        `Sales zone is the accumulator for ${childCount} sales zone(s) and cannot be deleted`,
      );
    }
    return this.salesZoneRepository.delete(id);
  }
}
