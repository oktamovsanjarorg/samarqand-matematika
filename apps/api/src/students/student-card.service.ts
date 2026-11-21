import { Injectable } from "@nestjs/common";
import type { AdminStudentCard } from "@samarqand/shared";
import { isFullAccess } from "../access/access-rules";
import { AccessService } from "../access/access.service";
import { AttentionService } from "../insights/attention.service";
import { StudentInsightsService } from "../insights/student-insights.service";
import { MyOfflineService } from "../offline/my-offline.service";
import { StatsService } from "../topic-tests/stats.service";
import { AdminStudentsService } from "./admin-students.service";
import { MySchoolService } from "./my-school.service";

/** Ustoz: o'quvchining bitta sahifadagi kartasi (T-068). Faqat mavjud servislarni birlashtiradi */
@Injectable()
export class StudentCardService {
  constructor(
    private readonly students: AdminStudentsService,
    private readonly access: AccessService,
    private readonly attention: AttentionService,
    private readonly insights: StudentInsightsService,
    private readonly stats: StatsService,
    private readonly school: MySchoolService,
    private readonly offline: MyOfflineService,
  ) {}

  async get(id: string): Promise<AdminStudentCard> {
    const student = await this.students.get(id);
    const [facts, reasons, recs, stats, school, offline] = await Promise.all([
      this.access.facts(id),
      this.attention.forStudent(id),
      this.insights.recommendations(id),
      this.stats.my(id),
      this.school.get(id),
      this.offline.list(id),
    ]);
    return {
      student,
      access: {
        full: isFullAccess(facts),
        accepted: facts.accepted,
        parentApproved: facts.approvedParents > 0,
        paid: facts.paid,
        mode: facts.mode,
      },
      reasons,
      weak: recs.items,
      stats,
      school,
      offline,
    };
  }
}
