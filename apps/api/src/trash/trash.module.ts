import { Global, Module } from "@nestjs/common";
import { TrashController } from "./trash.controller";
import { TrashService } from "./trash.service";

/** Axlat qutisi (T-099): kontent servislari o'chirishda shu yerga yozadi */
@Global()
@Module({
  controllers: [TrashController],
  providers: [TrashService],
  exports: [TrashService],
})
export class TrashModule {}
