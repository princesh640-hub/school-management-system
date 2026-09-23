import { Controller, Post, Get, Body, HttpCode, HttpStatus, Res, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user with email and password' })
  @SwaggerResponse({ status: 200, description: 'User authenticated successfully' })
  @SwaggerResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.authService.login(dto);

    // Set HttpOnly + Secure cookie for browser-based Web clients
    const isProd = process.env.NODE_ENV === 'production';
    const cookieFlags = [
      `refreshToken=${result.tokens.refreshToken}`,
      'HttpOnly',
      'Path=/api/v1/auth',
      'SameSite=Strict',
      `Max-Age=${7 * 24 * 60 * 60}`,
    ];
    if (isProd) {
      cookieFlags.push('Secure');
    }
    res.header('Set-Cookie', cookieFlags.join('; '));

    return result;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @SwaggerResponse({ status: 200, description: 'Access token renewed' })
  @SwaggerResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(
    @Body() dto: Partial<RefreshTokenDto>,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    // Read from body (mobile/desktop) or parse from HttpOnly cookie (web)
    let token = dto.refreshToken;

    if (!token && req.headers.cookie) {
      const match = req.headers.cookie
        .split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith('refreshToken='));
      if (match) {
        token = match.substring('refreshToken='.length);
      }
    }

    const newTokens = await this.authService.refreshToken({
      refreshToken: token || '',
    });

    const isProd = process.env.NODE_ENV === 'production';
    const cookieFlags = [
      `refreshToken=${newTokens.refreshToken}`,
      'HttpOnly',
      'Path=/api/v1/auth',
      'SameSite=Strict',
      `Max-Age=${7 * 24 * 60 * 60}`,
    ];
    if (isProd) {
      cookieFlags.push('Secure');
    }
    res.header('Set-Cookie', cookieFlags.join('; '));

    return newTokens;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and clear authentication cookies' })
  async logout(@Res({ passthrough: true }) res: FastifyReply) {
    res.header(
      'Set-Cookie',
      'refreshToken=; HttpOnly; Path=/api/v1/auth; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    );
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Retrieve authenticated user session profile and permissions' })
  async getMe(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.getMe(user.id);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Change current user password' })
  async changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, dto);
  }
}
