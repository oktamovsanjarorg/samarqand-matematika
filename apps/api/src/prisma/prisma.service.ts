import { Injectable, OnApplicationShutdown } from "@nestjs/common";
import { PrismaClient } from "@samarqand/db";

@Injectable()
export class PrismaService extends PrismaClient implements OnApplicationShutdown {
  /**
   * T-136: eng oxirida uziladi. Nest avval onModuleDestroy (scheduler tick'lari tugaydi),
   * keyin HTTP server (boshlangan so'rovlar tugaydi), so'ng onApplicationShutdown.
   */
  async onApplicationShutdown() {
    await this.$disconnect();
  }
}
