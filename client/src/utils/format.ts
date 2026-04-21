import { formatDistanceToNowStrict } from "date-fns";

export const formatRelativeTime = (date?: string | Date | null) => {
  if (!date) {
    return "";
  }

  return formatDistanceToNowStrict(new Date(date), {
    addSuffix: true,
  });
};

export const formatClock = (date?: string | Date | null) => {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
};

export const compactNumber = (value: number) =>
  new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
