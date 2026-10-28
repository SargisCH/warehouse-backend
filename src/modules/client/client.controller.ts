import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ClientService } from './client.service';
import { CreateClientDto, UpdateClientDto } from './client.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { AuthUser } from 'src/modules/auth/auth.user.decorator';
import { User } from 'src/drizzle/schema';

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('client')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Post()
  create(@AuthUser() user: User, @Body() createClientDto: CreateClientDto) {
    return this.clientService.create(user, createClientDto);
  }

  @Get()
  findAll(
    @AuthUser() user: User,
    @Query('searchTerm') searchTerm?: string,
    @Query('sortKey') sortKey?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('managerId') managerId?: string,
  ) {
    return this.clientService.findAll(user, {
      searchTerm,
      sortKey,
      sortOrder,
      managerId: managerId ? Number(managerId) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clientService.findOne(id);
  }

  @Patch(':id')
  update(
    @AuthUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClientDto: UpdateClientDto,
  ) {
    return this.clientService.update(user, id, updateClientDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.clientService.remove(id);
  }
}
