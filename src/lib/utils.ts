import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugifyIdentifier(value: string) {
  return value
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w.]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

export function downloadTextFile(
  filename: string,
  content: string,
  type = "text/plain"
) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
