import type { NextFunction, Request, Response } from "express";
import multer from "multer";

import { AppError } from "../utils/http";

export const notFoundHandler = (
  _req: Request,
  res: Response,
) => {
  res.status(404).json({ ok: false, message: "Route not found." });
};

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (error instanceof multer.MulterError) {
    res.status(400).json({ ok: false, message: error.message });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({ ok: false, message: error.message });
    return;
  }

  res.status(500).json({
    ok: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong."
        : error.message,
  });
};
