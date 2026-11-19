import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ERROR_CODES, type AuthResponse } from "@samarqand/shared";
import { InitDataError, validateInitData, type TelegramInitUser } from "@samarqand/shared/server";
import { ENV, type Env } from "../config/env";
import { UsersService } from "../users/users.service";

@Injectable()
export class AuthService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly jwt: JwtService,
    private readonly users: UsersService,
  ) {}

  /** Mini App initData'si imzosi tekshiriladi, keyin qisqa muddatli JWT beriladi */
  async loginWithTelegram(initData: string): Promise<AuthResponse> {
    const user = await this.users.upsertFromTelegram(this.verify(initData));
    if (user.isBlocked) {
      const message = user.blockedReason ? `Hisob bloklangan: ${user.blockedReason}` : "Hisob bloklangan";
      throw new UnauthorizedException({ code: ERROR_CODES.BLOCKED, message });
    }
    const token = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return { token, expiresIn: this.env.JWT_TTL, user: await this.users.me(user.id) };
  }

  private verify(initData: string): TelegramInitUser {
    try {
      return validateInitData(initData, this.env.BOT_TOKEN, this.env.INIT_DATA_MAX_AGE_SEC).user;
    } catch (e) {
      if (e instanceof InitDataError) throw new UnauthorizedException(e.message);
      throw e;
    }
  }
}
