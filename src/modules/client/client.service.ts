import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClientListOptions,
  ClientRepository,
} from 'src/repositories/client.repository';
import { ClientGroupsRepository } from 'src/repositories/client_groups.repository';
import { ManagerRepository } from 'src/repositories/manager.repository';
import { SalesZoneRepository } from 'src/repositories/sales_zone.repository';
import { PriceListRepository } from 'src/repositories/price_list.repository';
import { CreateClientDto, UpdateClientDto } from './client.dto';
import { User } from 'src/drizzle/schema';

// A user on this role sees only the outlets of the agent record sharing their
// email, matching how the sales app scopes a rep to their own round.
const MANAGER_ROLE = 'Manager';

// Postgres unique_violation - see the same note in manager.service.ts.
const UNIQUE_VIOLATION = '23505';
const CODE_RETRIES = 5;

type UserWithRole = User & { role?: string };

@Injectable()
export class ClientService {
  constructor(
    private readonly clientRepository: ClientRepository,
    private readonly clientGroupsRepository: ClientGroupsRepository,
    private readonly salesZoneRepository: SalesZoneRepository,
    private readonly managerRepository: ManagerRepository,
    private readonly priceListRepository: PriceListRepository,
  ) {}

  private async assertPriceListBelongsToTenant(
    priceListId: number | null | undefined,
    tenantId: number,
  ) {
    if (priceListId === null || priceListId === undefined) return;
    const priceList = await this.priceListRepository.findById(priceListId);
    if (!priceList || priceList.tenantId !== tenantId) {
      throw new BadRequestException('Price list not found');
    }
  }

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

  private async assertGroupBelongsToTenant(
    clientGroupId: number | null | undefined,
    tenantId: number,
  ) {
    if (clientGroupId === null || clientGroupId === undefined) return;
    const group = await this.clientGroupsRepository.findById(clientGroupId);
    if (!group || group.tenantId !== tenantId) {
      throw new BadRequestException('Client group not found');
    }
  }

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

  private async assertLinksBelongToTenant(
    dto: CreateClientDto | UpdateClientDto,
    tenantId: number,
  ) {
    await this.assertGroupBelongsToTenant(dto.clientGroupId, tenantId);
    await this.assertZoneBelongsToTenant(dto.salesZoneId, tenantId);
    await this.assertManagerBelongsToTenant(dto.managerId, tenantId);
    await this.assertPriceListBelongsToTenant(dto.priceListId, tenantId);
  }

  async create(user: UserWithRole, createClientDto: CreateClientDto) {
    await this.assertLinksBelongToTenant(createClientDto, user.tenantId);

    for (let attempt = 0; attempt < CODE_RETRIES; attempt++) {
      const code = await this.clientRepository.nextCode(user.tenantId);
      try {
        return await this.clientRepository.create({
          ...createClientDto,
          code,
          tenantId: user.tenantId,
        });
      } catch (e) {
        const isDuplicateCode =
          (e?.cause?.code ?? e?.code) === UNIQUE_VIOLATION &&
          String(e?.cause?.constraint ?? e?.constraint) ===
            'clients_tenant_code';
        if (!isDuplicateCode || attempt === CODE_RETRIES - 1) throw e;
      }
    }
  }

  async findAll(user: UserWithRole, options: ClientListOptions) {
    const scoped = { ...options };

    if (user.role === MANAGER_ROLE) {
      const manager = await this.managerRepository.findByEmail(
        user.tenantId,
        user.email,
      );
      // No agent record means no round to show, not the whole tenant's book.
      if (!manager) return [];
      scoped.managerId = manager.id;
    }

    return this.clientRepository.findByTenant(user.tenantId, scoped);
  }

  async findOne(id: number) {
    const client = await this.clientRepository.findById(id);
    if (!client) {
      throw new NotFoundException('Client not found');
    }
    return client;
  }

  async update(
    user: UserWithRole,
    id: number,
    updateClientDto: UpdateClientDto,
  ) {
    await this.findOne(id);
    await this.assertLinksBelongToTenant(updateClientDto, user.tenantId);
    return this.clientRepository.update(id, updateClientDto);
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.clientRepository.delete(id);
  }
}
