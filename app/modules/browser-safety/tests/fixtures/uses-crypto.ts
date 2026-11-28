import { createHash } from "node:crypto";

export const digest = (text: string) => createHash("sha256").update(text).digest("hex");
