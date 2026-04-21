import { Schema, model, type HydratedDocument, type InferSchemaType, type Types } from "mongoose";

const ChatSchema = new Schema(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    isGroup: {
      type: Boolean,
      default: false,
    },
    groupName: String,
    groupDescription: {
      type: String,
      default: "",
    },
    groupAvatar: {
      type: String,
      default: "",
    },
    groupAvatarPublicId: {
      type: String,
      default: "",
    },
    admins: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    directChatKey: {
      type: String,
      unique: true,
      sparse: true,
    },
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
    pinnedMessages: [
      {
        type: Schema.Types.ObjectId,
        ref: "Message",
      },
    ],
    lastMessage: {
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

ChatSchema.index({ participants: 1, updatedAt: -1 });

export type IChat = InferSchemaType<typeof ChatSchema> & {
  _id: Types.ObjectId;
};

export type ChatDocument = HydratedDocument<IChat>;

export const Chat = model<IChat>("Chat", ChatSchema);
