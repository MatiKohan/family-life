import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type TaskStatus = 'todo' | 'in-progress' | 'done';

@Schema({ _id: false })
export class TaskItem {
  @Prop({ required: true }) id!: string;
  @Prop({ required: true }) text!: string;
  @Prop({ type: String, default: null }) assigneeId!: string | null;
  @Prop({ type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' }) status!: TaskStatus;
  @Prop({ type: Date, default: null }) dueDate!: Date | null;
  @Prop({ default: () => new Date() }) createdAt!: Date;
}

export const TaskItemSchema = SchemaFactory.createForClass(TaskItem);
