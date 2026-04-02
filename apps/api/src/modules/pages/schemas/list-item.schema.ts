import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ListItem {
  @Prop({ required: true }) id!: string;
  @Prop({ required: true }) text!: string;
  @Prop({ default: false }) checked!: boolean;
  @Prop({ type: String, default: null }) assigneeId!: string | null;
  @Prop({ type: Date, default: null }) dueDate!: Date | null;
  @Prop({ default: () => new Date() }) createdAt!: Date;
}

export const ListItemSchema = SchemaFactory.createForClass(ListItem);
