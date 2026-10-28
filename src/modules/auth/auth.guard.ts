import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import AWS_SDK from 'aws-sdk';

import { UserService } from '../user/user.service';

// import { UserService } from '../user/user.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private userService: UserService) {}
  // @Inject('UserService') private readonly userService: UserService,
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const accessToken = this.extractTokenFromHeader(request);
    const poolId = process.env.COGNITO_USER_POOL_ID || 'us-east-1_QsJSsFk4H';
    const region = poolId.split('_')[0];
    // GetUser validates the token with Cognito; also restrict which user pool we trust.
    // Otherwise a token from another pool with the same email could impersonate a local account.
    try {
      const payload = JSON.parse(
        Buffer.from(accessToken?.split('.')[1] || '', 'base64url').toString(),
      );
      if (
        payload.iss !==
          `https://cognito-idp.${region}.amazonaws.com/${poolId}` ||
        payload.token_use !== 'access'
      )
        return false;
    } catch {
      return false;
    }
    const cognito = new AWS_SDK.CognitoIdentityServiceProvider({
      region,
    });
    try {
      const cogUser = await cognito
        .getUser({ AccessToken: accessToken })
        .promise();
      const userEmail = cogUser.UserAttributes.find(
        (a) => a.Name === 'email',
      )?.Value;
      if (userEmail) {
        const user = await this.userService.findUser({ email: userEmail });

        request.user = user;
        return !!user?.id;
      }
      return false;
    } catch (e) {
      console.log('e', e.message);
      return false;
    }
  }
  private extractTokenFromHeader(request: Request): string | undefined {
    const authToken = (request.headers as any).authorization;
    const [type, token] = authToken?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
