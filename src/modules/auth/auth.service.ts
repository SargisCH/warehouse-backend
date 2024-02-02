import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { User as UserModel } from '@prisma/client';
import AWS_SDK from 'aws-sdk';

import { GLOBAL_CONFIG } from '../../configs/global.config';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthHelpers } from '../../shared/helpers/auth.helpers';

import { AuthResponseDTO, LoginUserDTO, RegisterUserDTO } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  public async login(loginUserDTO: LoginUserDTO): Promise<AuthResponseDTO> {
    const userData = await this.userService.findUser({
      email: loginUserDTO.email,
    });

    if (!userData) {
      throw new UnauthorizedException();
    }

    const isMatch = await AuthHelpers.verify(
      loginUserDTO.password,
      userData.password,
    );

    if (!isMatch) {
      throw new UnauthorizedException();
    }

    const payload = {
      id: userData.id,
      email: userData.email,
      password: null,
      tenantId: userData.tenantId,
      companyName: userData.companyName,
      // role: userData.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: GLOBAL_CONFIG.security.expiresIn,
    });

    return {
      user: payload,
      accessToken: accessToken,
    };
  }
  public async register(user: RegisterUserDTO): Promise<User> {
    return this.userService.createUser(user);
  }
  public async verifyEmail({
    email,
    code,
  }: {
    email: string;
    code: string | number;
  }): Promise<{ verified: boolean }> {
    const cognito = new AWS_SDK.CognitoIdentityServiceProvider({
      region: 'us-east-1',
    });
    const params = {
      ClientId: 'ngltvt3dbqp86piipjoeic9cc', // tenant client id
      ConfirmationCode: String(code), // Replace with the actual code sent to the user
      Username: email,
    };
    await cognito.confirmSignUp(params).promise();
    return { verified: true };
  }

  public async getUser(email: string): Promise<Omit<UserModel, 'password'>> {
    const user = await this.prisma.user.findUnique({
      where: { email: email },
      include: { tenant: true },
    });
    delete user.password;
    return user;
  }
}
