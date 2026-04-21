import { User } from "../models/User";

const normalizeUsernameBase = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);

export const generateUniqueUsername = async (source: string) => {
  const baseCandidate = normalizeUsernameBase(source) || "pulse_user";
  const base = baseCandidate.slice(0, 20);
  let username = baseCandidate;
  let count = 1;

  while (await User.exists({ username })) {
    const suffix = `_${count}`;
    username = `${base.slice(0, Math.max(3, 24 - suffix.length))}${suffix}`;
    count += 1;
  }

  return username;
};

export const normalizeUsernameInput = (value: string) =>
  normalizeUsernameBase(value).slice(0, 24);
