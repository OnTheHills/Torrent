export function maskPrivateValue(value?: string | null) {
  return value?.trim() ? "••••••••" : "—";
}
