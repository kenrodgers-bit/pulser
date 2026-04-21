import { Schema, model, type HydratedDocument, type InferSchemaType, type Types } from "mongoose";

const MessageReactionSchema = new Schema(
  {
    emoji: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const MessageMetaSchema = new Schema(
  {
    publicId: String,
    originalName: String,
    mimeType: String,
    size: Number,
    thumbnailUrl: String,
    previewUrl: String,
    width: Number,
    height: Number,
    duration: Number,
  },
  { _id: false },
);

const MessageSchema = new Schema(
  {
    chatId: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
      default: null,
    },
    channelId: {
      type: Schema.Types.ObjectId,
      ref: "Channel",
      default: null,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["text", "image", "video", "audio", "file", "sticker", "emoji"],
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
    viewMode: {
      type: String,
      enum: ["once", "unlimited"],
      default: "unlimited",
    },
    viewedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    deliveredTo: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    reactions: [MessageReactionSchema],
    deletedFor: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    deletedForEveryoneAt: {
      type: Date,
      default: null,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: MessageMetaSchema,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

MessageSchema.index({ chatId: 1, createdAt: -1 });
MessageSchema.index({ channelId: 1, createdAt: -1 });

export type IMessage = InferSchemaType<typeof MessageSchema> & {
  _id: Types.ObjectId;
};

export type MessageDocument = HydratedDocument<IMessage>;

export const Message = model<IMessage>("Message", MessageSchema);
