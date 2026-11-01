"use client";
import { createContext, useContext, type ReactNode } from "react";
const Context = createContext(false);
export function PasswordPolicyProvider({ demonstration, children }: { demonstration: boolean; children: ReactNode }) {
  return <Context.Provider value={demonstration}>{demonstration && <aside className="demo-password-notice" role="status">Demonstration mode / ආදර්ශන ප්‍රකාරය · 4–5 digit passwords enabled / ඉලක්කම් 4–5 මුරපද සක්‍රියයි</aside>}{children}</Context.Provider>;
}
export function useDemonstrationPasswords() { return useContext(Context); }
export function passwordInputProps(props: Record<string, any>, demonstration: boolean) {
  return demonstration && props.type === "password" && props.minLength === 12
    ? { ...props, minLength: 4, pattern: "(?:[0-9]{4,5}|.{12,256})", title: "Use 4–5 digits, or 12–256 characters.", inputMode: "text" as const }
    : props;
}
