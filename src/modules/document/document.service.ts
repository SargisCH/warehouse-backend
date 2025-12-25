import { Inject, Injectable } from '@nestjs/common';
import { DocumentRepository } from 'src/repositories/document.repository';
import { DocumentDTO } from './document.dto';

@Injectable()
export class DocumentService {
  constructor(
    @Inject(DocumentRepository)
    private documentRepository: DocumentRepository,
  ) {}

  async find(where: { name?: string; id?: number }) {
    return this.documentRepository.find(where);
  }

  async findAll() {
    return this.documentRepository.findAll();
  }

  async create(item: DocumentDTO) {
    return this.documentRepository.create(item);
  }
}
