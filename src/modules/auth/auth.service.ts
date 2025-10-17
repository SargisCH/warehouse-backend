import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import AWS_SDK from 'aws-sdk';

import { GLOBAL_CONFIG } from '../../configs/global.config';
import { UserService } from '../user/user.service';
import { AuthHelpers } from '../../shared/helpers/auth.helpers';

import { AuthResponseDTO, LoginUserDTO, RegisterUserDTO } from './auth.dto';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import * as schema from 'src/drizzle/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';

AWS_SDK.config.update({
  region: 'us-west-2', // Replace with your desired region
  accessKeyId: process.env.AWS_ACCESS_KEY_ID, // Ensure these are set in your environment
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_ID,
});
@Injectable()
export class AuthService {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
    private userService: UserService,
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
  public async register(user: RegisterUserDTO) {
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

  public async getUser(email: string) {
    try {
      const user = await this.userService.findUser({ email });
      delete user.password;
      return user;
    } catch (e) {
      console.log('aaaa', e);
    }
  }
  public async updateSettings(
    body: {
      logo?: string;
      name?: string;
      fileType?: string;
    },
    user: any,
  ) {
    const s3 = new AWS_SDK.S3();
    const buffer = Buffer.from(body.logo.split(',')[1], 'base64');
    const [tenant] = await this.db
      .select()
      .from(schema.tenant)
      .where(eq(schema.tenant.id, user.tenantid || user.tenant));
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
      // await this.db.update(schema.tenant).set({}) .tenant.update({
      // where: { id: user.id },
      // data: { logo: data.Location },
      // });
      return user;
    } catch (err) {
      console.error('Error uploading file:', err);
      throw err;
    }
  }
}
