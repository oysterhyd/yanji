export const MAX_TEXT = 100_000;
export const MAX_SHORT = 200;

export class ValidationError extends Error {}

export function validateText(value: unknown, max: number, label: string): string {
  const text = String(value ?? "");
  if (text.length > max) throw new ValidationError(`${label}过长（最多 ${max} 字符）`);
  return text;
}

export function badRequest(message: string): Response {
  return Response.json({ error: message }, { status: 400 });
}
