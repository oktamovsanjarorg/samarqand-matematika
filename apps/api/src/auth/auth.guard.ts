import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { ERROR_CODES, type RoleName } from "@samarqand/shared";
import { PrismaService } from "../prisma/prisma.service";
import { IS_PUBLIC, JwtUser, ROLES_KEY } from "./decorators";

interface AuthRequest {
  headers?: { authorization?: string };
  user?: JwtUser;
}

function bearer(req: AuthRequest): string {
  const header = req.headers?.authorization;
  if (!header?.startsWith("Bearer ")) throw new UnauthorizedException("Token yoʻq");
  return header.slice(7);
}

/** Global guard: JWT tekshiradi, keyin @Roles() bo'yicha ruxsatni tekshiradi */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    const payload = await this.verify(bearer(req));
    const role = await this.currentRole(payload.sub);
    req.user = { ...payload, role };

    const roles = this.reflector.getAllAndOverride<RoleName[] | undefined>(ROLES_KEY, targets);
    if (roles?.length && !roles.includes(role)) throw new ForbiddenException("Ruxsat yoʻq");
    return true;
  }

  private async verify(token: string): Promise<JwtUser> {
    try {
      return await this.jwt.verifyAsync<JwtUser>(token);
    } catch {
      throw new UnauthorizedException("Token yaroqsiz");
    }
  }

  /**
   * Har so'rovda hisob bazadan tekshiriladi: bloklangan yoki o'chirilgan foydalanuvchining tokeni
   * darhol kuchini yo'qotadi, rol ham bazadagisi olinadi (tokendagisi eskirgan bo'lishi mumkin).
   */
  private async currentRole(userId: string): Promise<RoleName> {
    const db = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isBlocked: true, blockedReason: true },
    });
    if (!db) throw new UnauthorizedException("Hisob topilmadi");
    if (db.isBlocked) {
      const message = db.blockedReason ? `Hisob bloklangan: ${db.blockedReason}` : "Hisob bloklangan";
      throw new UnauthorizedException({ code: ERROR_CODES.BLOCKED, message });
    }
    return db.role;
  }
}
