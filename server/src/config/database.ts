import mongoose from "mongoose";

import { env } from "./env";

export const connectToDatabase = async () => {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongodbUri, {
    autoIndex: env.nodeEnv !== "production",
  });
};
