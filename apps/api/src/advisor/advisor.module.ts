import { Module } from "@nestjs/common";
import { AccessModule } from "../access/access.module";
import { AdvisorController } from "./advisor.controller";
import { AdvisorService } from "./advisor.service";

@Module({ imports: [AccessModule], controllers: [AdvisorController], providers: [AdvisorService] })
export class AdvisorModule {}
