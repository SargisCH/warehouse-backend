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
    const cognito = new AWS_SDK.CognitoIdentityServiceProvider({
      region: 'us-east-1',
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
        return true;
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
