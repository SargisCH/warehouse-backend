import { Controller, Get, UseGuards, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { DocumentService } from './document.service';
import { DocumentDTO } from './document.dto';

@ApiTags('document')
@Controller('/document')
export class DocumentController {
  constructor(private documentService: DocumentService) {}

  @Get()
  @UseGuards(AuthGuard)
  async getAll() {
    return this.documentService.findAll();
  }

  @Post('create')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Create a new document' })
  async create(@Body() item: DocumentDTO) {
    return this.documentService.create(item);
  }
}
