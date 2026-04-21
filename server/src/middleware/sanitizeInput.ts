import type { NextFunction, Request, Response } from "express";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Object.prototype.toString.call(value) === "[object Object]";

const sanitizeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    const cleanedKey = key.replace(/\$/g, "").replace(/\./g, "");

    if (!cleanedKey) {
      continue;
    }

    sanitized[cleanedKey] = sanitizeValue(nestedValue);
  }

  return sanitized;
};

const replaceObjectContents = (
  target: Record<string, unknown>,
  source: Record<string, unknown>,
) => {
  for (const key of Object.keys(target)) {
    delete target[key];
  }

  Object.assign(target, source);
};

export const sanitizeRequestInput = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  req.body = sanitizeValue(req.body) as Request["body"];
  req.params = sanitizeValue(req.params) as Request["params"];

  const currentQuery = req.query as unknown;
  const sanitizedQuery = sanitizeValue(currentQuery);

  if (isPlainObject(currentQuery) && isPlainObject(sanitizedQuery)) {
    replaceObjectContents(currentQuery, sanitizedQuery);
  }

  next();
};
