import type { Response } from "express";

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
) => res.status(statusCode).json({ ok: true, data });
