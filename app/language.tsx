"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { translate } from "@/lib/translation";
export type Language = "en" | "si";
const Context = createContext({ language: "en" as Language, enabled: false, t: (text: string): string => text, change: async (_value: Language) => {}, busy: false, error: "" });
export function LanguageProvider({ children, enabled, initial = "en", persist = false }: { children: ReactNode; enabled: boolean; initial?: Language; persist?: boolean }) {
  const [language, setLanguage] = useState<Language>(initial), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const effective = enabled ? language : "en";
  useEffect(() => { document.documentElement.lang = effective; return () => { document.documentElement.lang = "en"; }; }, [effective]);
  const t = (text: string) => translate(text, effective);
  async function change(value: Language) {
    if (!enabled || busy) return;
    setBusy(true); setError("");
    try {
      if (persist) {
        const response = await fetch("/api/preferences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: value }) });
        if (!response.ok) throw new Error("Could not save language. Please try again.");
      }
      setLanguage(value);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <Context.Provider value={{ language: effective, enabled, t, change, busy, error }}>{children}</Context.Provider>;
}
export function useLanguage() { return useContext(Context); }
export function LanguageSelector() {
  const { language, enabled, change, busy, error, t } = useLanguage();
  if (!enabled) return null;
  return <div className="language-control"><label><span>Language / සිංහල</span><select aria-label="Language / භාෂාව" value={language} disabled={busy} onChange={e => void change(e.target.value as Language)}><option value="en" lang="en">English</option><option value="si" lang="si">සිංහල</option></select></label>{busy && <small role="status">{t("Saving…")}</small>}{error && <small role="alert">{t(error)}</small>}</div>;
}
