import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
export const DeveloperOnly = () => SetMetadata('assistantDeveloper', true);
export function assertAssistantAccess(user: any, developer = false) {
  if (
    !user?.id ||
    !user.tenantId ||
    !['CONTRIBUTOR', 'DEVELOPER'].includes(user.assistantAccess) ||
    (developer && user.assistantAccess !== 'DEVELOPER')
  )
    throw new ForbiddenException('Assistant access is not allowed');
}
@Injectable()
export class AssistantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    assertAssistantAccess(
      context.switchToHttp().getRequest().user,
      this.reflector.get<boolean>('assistantDeveloper', context.getHandler()),
    );
    return true;
  }
}
