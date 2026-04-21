import type { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";

export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const result = validationResult(req);

  if (!result.isEmpty()) {
    res.status(422).json({
      ok: false,
      errors: result.array().map((issue) => ({
        path: issue.type === "field" ? issue.path : "unknown",
        message: issue.msg,
      })),
    });
    return;
  }

  next();
};
