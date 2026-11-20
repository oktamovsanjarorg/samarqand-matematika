import { Injectable } from "@nestjs/common";
import { STAFF_ROLES, type RoleName } from "@samarqand/shared";

/**
 * Pullik kontentga kirish (BR-A04: ustoz qabul qilgan + ota-ona tasdiqlagan + to'lov qilingan).
 * Obuna va ota-ona ulanishi T-020/T-025 da qo'shiladi; ungacha o'quvchi faqat bepul darslarni ochadi (BR-C02).
 */
@Injectable()
export class AccessService {
  async hasFullAccess(_userId: string, role: RoleName): Promise<boolean> {
    return STAFF_ROLES.includes(role);
  }
}
