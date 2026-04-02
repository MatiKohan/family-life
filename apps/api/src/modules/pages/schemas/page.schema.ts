import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ListItem, ListItemSchema } from './list-item.schema';
import { TaskItem, TaskItemSchema } from './task-item.schema';

export type PageDocument = Page & Document;

@Schema({ timestamps: true })
export class Page {
  @Prop({ required: true }) familyId!: string;
  @Prop({ required: true }) title!: string;
  @Prop({ default: '📄' }) emoji!: string;
  @Prop({ required: true, enum: ['list', 'events', 'tasks'] }) type!: string;
  @Prop({ type: [ListItemSchema], default: [] }) items!: ListItem[];
  @Prop({ type: [TaskItemSchema], default: [] }) taskItems!: TaskItem[];
  @Prop({ type: [String], default: [] }) eventIds!: string[];
  @Prop({ required: true }) createdBy!: string;
}

export const PageSchema = SchemaFactory.createForClass(Page);
