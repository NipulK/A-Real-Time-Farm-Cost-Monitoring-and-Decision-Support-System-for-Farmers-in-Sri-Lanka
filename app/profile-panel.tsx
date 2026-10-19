"use client";
import { FormEvent, useState } from "react";
import { useLanguage } from "./language";
type User = Record<string, any>;
const fields = [
  ["name", "Full name", "text", "name"],
  ["mobile", "Mobile number", "tel", "tel"],
  ["email", "Email address (optional)", "email", "email"],
  ["district", "District", "text", "address-level1"],
  ["village", "Village / area", "text", "address-level2"],
] as const;
export function ProfilePanel({ user, onRefresh }: { user: User; onRefresh: () => Promise<void> }) {
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(""), [saved, setSaved] = useState(false);
  if (user.account_type !== "independent") return null;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setSaved(false);
    const body = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await onRefresh(); setEditing(false); setSaved(true);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <section className="panel">
    <div className="panel-head"><div><h2>{t("My profile")}</h2><p>{t("Manage your personal and sign-in details.")}</p></div>
      {!editing && <button className="button" onClick={() => {setEditing(true); setError(""); setSaved(false);}}>{t("Edit profile")}</button>}
    </div>
    <p className="helper">{t("Farmer ID")}: {user.public_id}</p>
    {saved && <p role="status" className="notice">{t("Profile saved. Use your updated email or mobile number next time you sign in.")}</p>}
    {editing ? <form onSubmit={submit}>
      <div className="form-grid">{fields.map(([name,label,type,autoComplete]) => <label className="field" key={name}>
        <span>{t(label)}</span><input name={name} type={type} autoComplete={autoComplete} defaultValue={user[name] || ""} required={name !== "email"} maxLength={name === "email" ? 254 : name === "mobile" ? 32 : 200} disabled={busy} />
      </label>)}</div>
      <p className="helper">{t("Updating your profile location does not change your land records. Edit each land separately.")}</p>
      {error && <div className="error" role="alert">{t(error)}</div>}
      <div className="dialog-actions"><button type="button" className="button" disabled={busy} onClick={() => {setEditing(false); setError("");}}>{t("Cancel")}</button>
        <button className="button primary" disabled={busy}>{t(busy ? "Saving…" : "Save profile")}</button></div>
    </form> : <dl className="profile-details">{fields.map(([name,label]) => <div key={name}><dt>{t(label)}</dt><dd>{user[name] || t("Not provided")}</dd></div>)}</dl>}
  </section>;
}
