import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import dayjs from 'dayjs';

@Injectable()
export class ParseDatePipe implements PipeTransform<string, Date> {
  transform(value?: string): Date {
    if (!value) {
      return new Date();
    }
    const parsedDate = dayjs(value, 'YYYY-MM-DD', true); // Example date format, adjust as needed

    if (!parsedDate.isValid()) {
      throw new BadRequestException('Invalid date format');
    }
    return parsedDate.toDate();
  }
}
