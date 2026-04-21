import { Schema, model, type HydratedDocument, type InferSchemaType, type Types } from "mongoose";

const ChannelSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      maxlength: 240,
    },
    avatarUrl: {
      type: String,
      default: "",
    },
    avatarPublicId: {
      type: String,
      default: "",
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    admins: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    inviteCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    mutedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    lastPost: {
      messageId: {
        type: Schema.Types.ObjectId,
        ref: "Message",
      },
      senderId: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      type: String,
      snippet: String,
      createdAt: Date,
    },
  },
  {
    timestamps: true,
  },
);

ChannelSchema.index({ slug: 1 });
ChannelSchema.index({ visibility: 1, updatedAt: -1 });

export type IChannel = InferSchemaType<typeof ChannelSchema> & {
  _id: Types.ObjectId;
};

export type ChannelDocument = HydratedDocument<IChannel>;

export const Channel = model<IChannel>("Channel", ChannelSchema);
