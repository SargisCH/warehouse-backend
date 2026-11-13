import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleAsyncProvider } from '../../drizzle/drizzle.provider';
import * as schema from '../../drizzle/schema';

export function integrationIdentity(externalId: string) {
  if (
    typeof externalId !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(externalId)
  )
    throw new UnauthorizedException('Invalid integration identity');
  const hash = createHash('sha256')
    .update('finit-assistant:' + externalId)
    .digest('hex');
  // Stable, namespaced identity. No user-supplied email, password or business role.
  const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(
    13,
    16,
  )}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
  return { id, email: `finit-${hash}@assistant.invalid` };
}
export function authenticateFinit(headers: Record<string, unknown>) {
  const key = process.env.ASSISTANT_FINIT_INTEGRATION_KEY;
  const tenantId = Number(process.env.ASSISTANT_FINIT_TENANT_ID);
  if (
    !key ||
    key.length < 32 ||
    !Number.isSafeInteger(tenantId) ||
    tenantId < 1
  )
    throw new ServiceUnavailableException('Finit integration is disabled');
  const supplied = headers.authorization;
  if (
    typeof supplied !== 'string' ||
    supplied.length > 1024 ||
    !timingSafeEqual(
      createHash('sha256').update(supplied).digest(),
      createHash('sha256').update(`Bearer ${key}`).digest(),
    )
  )
    throw new UnauthorizedException();
  return {
    ...integrationIdentity(headers['x-finit-user-id'] as string),
    tenantId,
  };
}
@Injectable()
export class FinitIntegrationGuard implements CanActivate {
  constructor(
    @Inject(DrizzleAsyncProvider) private db: NodePgDatabase<typeof schema>,
  ) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const identity = authenticateFinit(req.headers);
    await this.db
      .insert(schema.users)
      .values({ ...identity, assistantAccess: 'CONTRIBUTOR' })
      .onConflictDoNothing({ target: schema.users.id });
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, identity.id));
    // Preserve revocations and fail closed on tenant changes/collisions.
    if (
      !user ||
      user.email !== identity.email ||
      user.tenantId !== identity.tenantId ||
      user.assistantAccess !== 'CONTRIBUTOR' ||
      user.roleId !== null ||
      user.password !== null
    )
      throw new ForbiddenException('Integration contributor is disabled');
    req.user = {
      id: user.id,
      tenantId: user.tenantId,
      assistantAccess: 'CONTRIBUTOR',
      project: 'finit',
    };
    return true;
  }
}
