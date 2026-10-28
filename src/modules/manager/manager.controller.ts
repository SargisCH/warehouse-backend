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
import { ManagerService } from './manager.service';
import { CreateManagerDto, UpdateManagerDto } from './manager.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { AuthUser } from 'src/modules/auth/auth.user.decorator';
import { User } from 'src/drizzle/schema';

@ApiTags('Managers')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('manager')
export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

  @Post()
  create(@AuthUser() user: User, @Body() createManagerDto: CreateManagerDto) {
    return this.managerService.create(user, createManagerDto);
  }

  @Get()
  findAll(
    @AuthUser() user: User,
    @Query('searchTerm') searchTerm?: string,
    @Query('sortKey') sortKey?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.managerService.findAll(user, {
      searchTerm,
      sortKey,
      sortOrder,
    });
  }

  // Declared before ':id' so the literal path isn't swallowed by the param route.
  @Get('deliverers')
  listDeliverers(@AuthUser() user: User) {
    return this.managerService.listDeliverers(user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.managerService.findOne(id);
  }

  @Patch(':id')
  update(
    @AuthUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateManagerDto: UpdateManagerDto,
  ) {
    return this.managerService.update(user, id, updateManagerDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.managerService.remove(id);
  }
}
