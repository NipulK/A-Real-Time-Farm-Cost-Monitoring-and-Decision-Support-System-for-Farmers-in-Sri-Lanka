export function normalizeMobile(value: string) {
  const raw = value.replace(/[\s()-]/g, "");
  if (/^0\d{9}$/.test(raw)) return "+94" + raw.slice(1);
  if (/^94\d{9}$/.test(raw)) return "+" + raw;
  if (/^\+[1-9]\d{7,14}$/.test(raw)) return raw;
  throw new Error(
    "400: Enter a valid mobile number, such as 0771234567 or +94771234567.",
  );
}
