import { Schema, model, type HydratedDocument, type InferSchemaType, type Types } from "mongoose";

const NotificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 120,
    },
    body: {
      type: String,
      required: true,
      maxlength: 240,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

NotificationSchema.index({ userId: 1, createdAt: -1 });

export type INotification = InferSchemaType<typeof NotificationSchema> & {
  _id: Types.ObjectId;
};

export type NotificationDocument = HydratedDocument<INotification>;

export const Notification = model<INotification>("Notification", NotificationSchema);
