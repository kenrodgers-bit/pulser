import { Message } from "../models/Message";
import { User } from "../models/User";
import {
  createMessageEntry,
  emitToMessageAudience,
  emitMessageToParticipants,
} from "../controllers/messagesController";
import { verifyAccessToken } from "../utils/tokenUtils";

const parseCookies = (cookieHeader = "") =>
  Object.fromEntries(
    cookieHeader
      .split(";")
      .map((pair) => pair.trim())
      .filter(Boolean)
      .map((pair) => {
        const [key, ...rest] = pair.split("=");
        return [decodeURIComponent(key), decodeURIComponent(rest.join("="))];
      }),
  );

export const registerSocketHandlers = (io: any) => {
  const connectionCounts = new Map<string, number>();

  io.use(async (socket: any, next: (error?: Error) => void) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      const token = cookies.accessToken || socket.handshake.auth?.token;

      if (!token) {
        next(new Error("Unauthorized"));
        return;
      }

      const payload = verifyAccessToken(token);
      socket.data.userId = payload.userId;
      next();
    } catch (_error) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket: any) => {
    const userId = socket.data.userId as string;
    const currentCount = connectionCounts.get(userId) ?? 0;
    connectionCounts.set(userId, currentCount + 1);

    socket.join(`user:${userId}`);

    if (currentCount === 0) {
      io.emit("user_online", { userId });
    }

    socket.on("join_chat", async (chatId: string) => {
      socket.join(`chat:${chatId}`);

      const undelivered = await Message.find({
        chatId,
        senderId: { $ne: userId },
        deliveredTo: { $ne: userId },
      }).select("_id");

      if (undelivered.length > 0) {
        await Message.updateMany(
          { _id: { $in: undelivered.map((message) => message._id) } },
          {
            $addToSet: {
              deliveredTo: userId,
            },
          },
        );

        await emitToMessageAudience(
          io,
          { chatId },
          "message_delivered",
          () => ({
            messageIds: undelivered.map((message) => message._id.toString()),
            userId,
          }),
        );
      }
    });

    socket.on("join_channel", (channelId: string) => {
      socket.join(`channel:${channelId}`);
    });

    socket.on("send_message", async (payload: any, callback?: (response: any) => void) => {
      try {
        const result = await createMessageEntry({
          userId,
          chatId: payload.chatId,
          channelId: payload.channelId,
          type: payload.type,
          content: payload.content,
          viewMode: payload.viewMode,
          replyTo: payload.replyTo,
        });

        await emitMessageToParticipants(io, result);

        callback?.({
          ok: true,
          data: {
            messageId: result.message._id.toString(),
          },
        });
      } catch (error: any) {
        callback?.({
          ok: false,
          message: error.message,
        });
      }
    });

    socket.on("typing_start", ({ chatId }: { chatId: string }) => {
      socket.to(`chat:${chatId}`).emit("user_typing", {
        chatId,
        userId,
        isTyping: true,
      });
    });

    socket.on("typing_stop", ({ chatId }: { chatId: string }) => {
      socket.to(`chat:${chatId}`).emit("user_typing", {
        chatId,
        userId,
        isTyping: false,
      });
    });

    socket.on("mark_read", async ({ chatId, messageIds }: { chatId: string; messageIds: string[] }) => {
      if (!Array.isArray(messageIds) || messageIds.length === 0) {
        return;
      }

      await Message.updateMany(
        {
          _id: { $in: messageIds },
          readBy: { $ne: userId },
        },
        {
          $addToSet: {
            readBy: userId,
          },
        },
      );

      await emitToMessageAudience(
        io,
        { chatId },
        "message_read",
        () => ({
          chatId,
          messageIds,
          userId,
        }),
      );
    });

    socket.on("react_message", async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const message = await Message.findById(messageId);

      if (!message || !emoji) {
        return;
      }

      message.reactions = message.reactions.filter(
        (reaction) => reaction.userId.toString() !== userId,
      ) as any;
      message.reactions.push({
        emoji,
        userId,
        createdAt: new Date(),
      } as any);
      await message.save();

      await emitToMessageAudience(
        io,
        {
          chatId: message.chatId?.toString() ?? null,
          channelId: message.channelId?.toString() ?? null,
        },
        "reaction_update",
        () => ({
          messageId,
          reactions: message.reactions.map((reaction) => ({
            emoji: reaction.emoji,
            userId: reaction.userId.toString(),
          })),
        }),
      );
    });

    socket.on("delete_message", async ({ messageId, mode }: { messageId: string; mode: "me" | "everyone" }) => {
      const message = await Message.findById(messageId);

      if (!message) {
        return;
      }

      if (mode === "everyone" && message.senderId.toString() !== userId) {
        return;
      }

      if (mode === "everyone") {
        message.content = "";
        message.metadata = null as any;
        message.deletedForEveryoneAt = new Date();
      } else if (!message.deletedFor.some((value) => value.toString() === userId)) {
        message.deletedFor.push(userId as any);
      }

      await message.save();

      const payload = {
        messageId,
        userId,
        mode,
      };

      if (mode === "everyone") {
        await emitToMessageAudience(
          io,
          {
            chatId: message.chatId?.toString() ?? null,
            channelId: message.channelId?.toString() ?? null,
          },
          "message_deleted",
          () => payload,
        );
      } else {
        io.to(`user:${userId}`).emit("message_deleted", payload);
      }
    });

    socket.on("disconnect", async () => {
      const remaining = (connectionCounts.get(userId) ?? 1) - 1;

      if (remaining <= 0) {
        connectionCounts.delete(userId);
        io.emit("user_offline", { userId });
        await User.findByIdAndUpdate(userId, { lastSeenAt: new Date() });
      } else {
        connectionCounts.set(userId, remaining);
      }
    });
  });
};
