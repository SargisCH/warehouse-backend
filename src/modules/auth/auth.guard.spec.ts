import AWS from 'aws-sdk';
import { AuthGuard } from './auth.guard';
jest.mock('aws-sdk', () => ({
  CognitoIdentityServiceProvider: jest.fn(),
  config: { update: jest.fn() },
}));
const token = (payload: any) =>
  `header.${Buffer.from(JSON.stringify(payload)).toString(
    'base64url',
  )}.signature`;
function context(accessToken: string) {
  const request: any = { headers: { authorization: `Bearer ${accessToken}` } };
  return {
    request,
    context: { switchToHttp: () => ({ getRequest: () => request }) } as any,
  };
}
describe('Cognito user-pool boundary', () => {
  beforeEach(() => jest.clearAllMocks());
  it('rejects tokens from another pool before looking up an email', async () => {
    const service = { findUser: jest.fn() };
    const { context: ctx } = context(
      token({
        iss: 'https://cognito-idp.us-east-1.amazonaws.com/another-pool',
        token_use: 'access',
      }),
    );
    expect(await new AuthGuard(service as any).canActivate(ctx)).toBe(false);
    expect(service.findUser).not.toHaveBeenCalled();
    expect(AWS.CognitoIdentityServiceProvider).not.toHaveBeenCalled();
  });
  it('validates a token with Cognito before using database permissions', async () => {
    const pool = process.env.COGNITO_USER_POOL_ID || 'us-east-1_QsJSsFk4H';
    const region = pool.split('_')[0];
    (
      AWS.CognitoIdentityServiceProvider as unknown as jest.Mock
    ).mockImplementation(() => ({
      getUser: () => ({
        promise: () =>
          Promise.resolve({
            UserAttributes: [{ Name: 'email', Value: 'dev@example.com' }],
          }),
      }),
    }));
    const user = { id: 'uuid', tenantId: 7, assistantAccess: 'DEVELOPER' };
    const service = { findUser: jest.fn().mockResolvedValue(user) };
    const { context: ctx, request } = context(
      token({
        iss: `https://cognito-idp.${region}.amazonaws.com/${pool}`,
        token_use: 'access',
      }),
    );
    expect(await new AuthGuard(service as any).canActivate(ctx)).toBe(true);
    expect(request.user).toBe(user);
  });
});
