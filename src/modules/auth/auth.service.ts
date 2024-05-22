import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { User as UserModel } from '@prisma/client';
import AWS_SDK from 'aws-sdk';
import fs from 'fs';

import { GLOBAL_CONFIG } from '../../configs/global.config';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthHelpers } from '../../shared/helpers/auth.helpers';

import { AuthResponseDTO, LoginUserDTO, RegisterUserDTO } from './auth.dto';
AWS_SDK.config.update({
  region: 'us-west-2', // Replace with your desired region
  accessKeyId: process.env.AWS_ACCESS_KEY, // Ensure these are set in your environment
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});
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
      role: userData.role,
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
    console.log('user', user);
    return user;
  }
  public async updateSettings(
    body: {
      logo?: string;
      name?: string;
      fileType?: string;
    },
    user: User,
  ): Promise<Omit<UserModel, 'password'>> {
    const s3 = new AWS_SDK.S3();
    const buffer = Buffer.from(body.logo.split(',')[1], 'base64');
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
    });
    // Set up the S3 upload parameters
    const [, type] = body.fileType.split('/');
    const params = {
      Bucket: 'warehouse-logos',
      Key: `${tenant.id}/${new Date().valueOf()}logo.${type || 'jpg'}`,
      Body: buffer,
      ContentEncoding: 'base64', // Required for base64 data
      ContentType: body.fileType || 'image/jpeg', // Change based on your content type
      ACL: 'public-read',
    };
    try {
      // Upload the image to S3
      const data = await s3.upload(params).promise();
      await this.prisma.tenant.update({
        where: { id: user.id },
        data: { logo: data.Location },
      });
      return this.prisma.user.findUnique({
        where: { id: user.id },
        include: { tenant: true },
      });
    } catch (err) {
      console.error('Error uploading file:', err);
      throw err;
    }
  }
}
