import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: CallableFunction): void {
    // TODO: use this.logger.log
    console.log(
      `[API Request] ${req.method} ${req.originalUrl}: ${/\/assistant(?:\/|$)/.test(req.path) ? '[assistant content omitted]' : JSON.stringify(req.body)}`,
    );
    next();
  }
}
