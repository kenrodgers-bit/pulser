import { Schema, model, type HydratedDocument, type InferSchemaType, type Types } from "mongoose";

const StoryViewerSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    viewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const StoryReactionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    emoji: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const StorySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mediaUrl: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
    mediaType: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },
    thumbnailUrl: {
      type: String,
      default: "",
    },
    caption: {
      type: String,
      default: "",
      maxlength: 180,
    },
    viewers: [StoryViewerSchema],
    reactions: [StoryReactionSchema],
    expiresAt: {
      type: Date,
      required: true,
      index: {
        expires: 0,
      },
    },
  },
  {
    timestamps: true,
  },
);

StorySchema.index({ userId: 1, createdAt: -1 });

export type IStory = InferSchemaType<typeof StorySchema> & {
  _id: Types.ObjectId;
};

export type StoryDocument = HydratedDocument<IStory>;

export const Story = model<IStory>("Story", StorySchema);
