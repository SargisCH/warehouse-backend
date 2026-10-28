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
import { ClientGroupsService } from './client_groups.service';
import {
  CreateClientGroupDto,
  UpdateClientGroupDto,
} from './client_groups.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { AuthUser } from 'src/modules/auth/auth.user.decorator';
import { User } from 'src/drizzle/schema';

@ApiTags('Client groups')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('client-group')
export class ClientGroupsController {
  constructor(private readonly clientGroupsService: ClientGroupsService) {}

  @Post()
  create(
    @AuthUser() user: User,
    @Body() createClientGroupDto: CreateClientGroupDto,
  ) {
    return this.clientGroupsService.create(user, createClientGroupDto);
  }

  @Get()
  findAll(
    @AuthUser() user: User,
    @Query('searchTerm') searchTerm?: string,
    @Query('sortKey') sortKey?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.clientGroupsService.findAll(user, {
      searchTerm,
      sortKey,
      sortOrder,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clientGroupsService.findOne(id);
  }

  @Patch(':id')
  update(
    @AuthUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClientGroupDto: UpdateClientGroupDto,
  ) {
    return this.clientGroupsService.update(user, id, updateClientGroupDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.clientGroupsService.remove(id);
  }
}
