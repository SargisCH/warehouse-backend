import {
  Body,
  Controller,
  Post,
  Put,
  Req,
  Response,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { User as UserModel } from '@prisma/client';

import { JWT_EXPIRY_SECONDS } from '../../shared/constants/global.constants';

import { AuthService } from './auth.service';
import { AuthResponseDTO, LoginUserDTO, RegisterUserDTO } from './auth.dto';
import { AuthGuard } from './auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ description: 'Login user' })
  @ApiBody({ type: LoginUserDTO })
  @ApiResponse({ type: AuthResponseDTO })
  async login(
    @Body() user: LoginUserDTO,
    @Response() res,
  ): Promise<AuthResponseDTO> {
    const loginData = await this.authService.login(user);

    res.cookie('accessToken', loginData.accessToken, {
      expires: new Date(new Date().getTime() + JWT_EXPIRY_SECONDS * 1000),
      sameSite: 'strict',
      secure: true,
      httpOnly: true,
    });

    return res.status(200).send(loginData);
  }

  @Post('register')
  async register(@Body() user: RegisterUserDTO): Promise<User> {
    return this.authService.register(user);
  }

  @Post('verify-email')
  async verifyEmail(
    @Body() verifyData: { email: string; code: string | number },
  ): Promise<{ verified: boolean }> {
    return this.authService.verifyEmail(verifyData);
  }

  @Post('get-user')
  async getUser(
    @Body() body: { email: string },
  ): Promise<Omit<UserModel, 'password'>> {
    console.log('body email', body.email);
    return this.authService.getUser(body.email);
  }

  @UseGuards(AuthGuard)
  @Put('settings')
  async updateSettings(
    @Req() request: Request,
    @Body() body: { logo?: string; name?: string; fileType?: string },
  ): Promise<Omit<UserModel, 'password'>> {
    const user = (request as any).user as User;
    return this.authService.updateSettings(body, user);
  }

  // @Post('logout')
  // logout(@Response() res): void {
  //   res.clearCookie('accessToken');
  //   res.status(200).send({ success: true });
  // }
}
