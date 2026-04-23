import mongoose from "mongoose";

import { env } from "./env";

let connectionPromise: Promise<typeof mongoose> | null = null;

export const connectToDatabase = async () => {
  mongoose.set("strictQuery", true);

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(env.mongodbUri, {
        autoIndex: env.nodeEnv !== "production",
      })
      .catch((error) => {
        connectionPromise = null;
        throw error;
      });
  }

  await connectionPromise;
  return mongoose.connection;
};
