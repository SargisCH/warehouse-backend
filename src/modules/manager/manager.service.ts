import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ManagerListOptions,
  ManagerRepository,
} from 'src/repositories/manager.repository';
import { ClientRepository } from 'src/repositories/client.repository';
import { SalesZoneRepository } from 'src/repositories/sales_zone.repository';
import { CreateManagerDto, UpdateManagerDto } from './manager.dto';
import { User } from 'src/drizzle/schema';

// Postgres unique_violation. Two concurrent creates can pick the same «Կոդ»;
// the unique index is what actually settles it, so we retry on that.
const UNIQUE_VIOLATION = '23505';
const CODE_RETRIES = 5;

@Injectable()
export class ManagerService {
  constructor(
    private readonly managerRepository: ManagerRepository,
    private readonly clientRepository: ClientRepository,
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

  // Likewise for the deliverer, which is another manager of the tenant.
  private async assertDelivererIsAvailable(
    delivererId: number | null | undefined,
    tenantId: number,
  ) {
    if (delivererId === null || delivererId === undefined) return;
    const deliverer = await this.managerRepository.findById(delivererId);
    if (!deliverer || deliverer.tenantId !== tenantId) {
      throw new BadRequestException('Deliverer not found');
    }
  }

  private async assertEmailIsFree(
    email: string | undefined,
    tenantId: number,
    exceptId?: number,
  ) {
    if (!email) return;
    const existing = await this.managerRepository.findByEmail(tenantId, email);
    if (existing && existing.id !== exceptId) {
      throw new ConflictException('A manager with this email already exists');
    }
  }

  // Every agent can deliver, so the choice is the tenant's managers.
  async listDeliverers(user: User) {
    return this.managerRepository.findByTenant(user.tenantId, {
      sortKey: 'code',
    });
  }

  async create(user: User, createManagerDto: CreateManagerDto) {
    await this.assertZoneBelongsToTenant(
      createManagerDto.salesZoneId,
      user.tenantId,
    );
    await this.assertDelivererIsAvailable(
      createManagerDto.delivererId,
      user.tenantId,
    );
    await this.assertEmailIsFree(createManagerDto.email, user.tenantId);

    for (let attempt = 0; attempt < CODE_RETRIES; attempt++) {
      const code = await this.managerRepository.nextCode(user.tenantId);
      try {
        return await this.managerRepository.create({
          ...createManagerDto,
          code,
          tenantId: user.tenantId,
        });
      } catch (e) {
        // Only a duplicate code is worth another pass; anything else is real.
        const isDuplicateCode =
          (e?.cause?.code ?? e?.code) === UNIQUE_VIOLATION &&
          String(e?.cause?.constraint ?? e?.constraint) ===
            'managers_tenant_code';
        if (!isDuplicateCode || attempt === CODE_RETRIES - 1) throw e;
      }
    }
  }

  async findAll(user: User, options: ManagerListOptions) {
    return this.managerRepository.findByTenant(user.tenantId, options);
  }

  async findOne(id: number) {
    const manager = await this.managerRepository.findById(id);
    if (!manager) {
      throw new NotFoundException('Manager not found');
    }
    return manager;
  }

  async update(user: User, id: number, updateManagerDto: UpdateManagerDto) {
    await this.findOne(id);
    await this.assertZoneBelongsToTenant(
      updateManagerDto.salesZoneId,
      user.tenantId,
    );
    await this.assertDelivererIsAvailable(
      updateManagerDto.delivererId,
      user.tenantId,
    );
    await this.assertEmailIsFree(updateManagerDto.email, user.tenantId, id);
    return this.managerRepository.update(id, updateManagerDto);
  }

  async remove(id: number) {
    await this.findOne(id);
    // Buyers point at the agent, so removing one out from under them would
    // leave the list screen with dangling links.
    const clientCount = await this.clientRepository.countByManager(id);
    if (clientCount > 0) {
      throw new BadRequestException(
        `Cannot delete a manager with ${clientCount} attached buyer(s)`,
      );
    }
    return this.managerRepository.delete(id);
  }
}
