import { Module } from "@nestjs/common";
import { MediaStore } from "./media-store";

@Module({ providers: [MediaStore], exports: [MediaStore] })
export class MediaModule {}
