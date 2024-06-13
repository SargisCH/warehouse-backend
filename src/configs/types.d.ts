import { Request } from '@nestjs/common';
import { User } from '@prisma/client';

export interface RequestExtended extends Request {
  user: User;
}
