"use client";
import { createContext, useContext, useId, type ReactNode } from "react";
import { useLanguage } from "./language";
const Context = createContext(false);
export function PasswordPolicyProvider({ demonstration, children }: { demonstration: boolean; children: ReactNode }) {
  return <Context.Provider value={demonstration}>{children}</Context.Provider>;
}
export function useDemonstrationPasswords() { return useContext(Context); }
export function passwordInputProps(props: Record<string, any>, demonstration: boolean) {
  return demonstration && props.type === "password" && props.minLength === 12
    ? { ...props, minLength: 4, pattern: "(?:[0-9]{4,5}|.{12,256})", title: "Use 4–5 digits, or 12–256 characters.", inputMode: "text" as const }
    : props;
}

export function PasswordInput({ inputProps }: { inputProps: Record<string, any> }) {
  const demonstration = useDemonstrationPasswords();
  const { t } = useLanguage();
  const hintId = useId();
  const showHint = inputProps.type === "password" && inputProps.minLength === 12 && inputProps.name !== "confirm_password";
  const props = passwordInputProps(inputProps, demonstration);
  const hint = t(demonstration ? "Use a 4–5 digit number. A password of 12–256 characters is also accepted." : "Use a password between 12 and 256 characters.");
  return <><input {...props} {...(showHint ? { "aria-describedby": [inputProps["aria-describedby"], hintId].filter(Boolean).join(" "), title: hint } : {})} />{showHint && <small id={hintId} className="password-hint">{hint}</small>}</>;
}
