"use client";
import { FarmerExpenseOverview } from "./role-dashboards";
import { LanguageProvider, LanguageSelector, useLanguage } from "./language";
import { FormEvent, useEffect, useState } from "react";
import {
  Sprout,
  ArrowLeft,
  LogOut,
  Plus,
  FileText,
  MapPin,
  ShieldCheck,
} from "lucide-react";
type R = Record<string, any>;
const money = (n: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 2,
  }).format(n / 100);
function Field({ label, ...props }: { label: string; [key: string]: any }) {
  const { t } = useLanguage();
  return (
    <label className="field">
      <span>{t(label)}</span>
      <input {...props} />
    </label>
  );
}
function Select({
  label,
  name,
  children,
  value,
  onChange,
  defaultValue,
}: {
  label: string;
  name: string;
  children: React.ReactNode;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  defaultValue?: string;
}) {
  const { t } = useLanguage();
  return (
    <label className="field">
      <span>{t(label)}</span>
      <select
        name={name}
        aria-label={t(label)}
        value={value}
        onChange={onChange}
        defaultValue={defaultValue}
        required
      >
        {children}
      </select>
    </label>
  );
}
function LandFields({ land }: { land?: R }) {
  const { t } = useLanguage();
  return (
    <>
      <Field
        label={t("Land name")}
        name="land_name"
        required
        defaultValue={land?.name}
      />
      <Field
        label={t("Land district")}
        name="land_district"
        required
        defaultValue={land?.district}
      />
      <Field
        label={t("Land village / area")}
        name="land_village"
        required
        defaultValue={land?.village}
      />
      <Field
        label={t("Land address / location description")}
        name="land_location"
        required
        maxLength={1000}
        defaultValue={land?.location}
      />
      <Field
        label={t("Land area")}
        name="land_area"
        type="number"
        min="0.001"
        step="0.001"
        required
        defaultValue={land?.area}
      />
      <Select
        label={t("Area unit")}
        name="land_unit"
        defaultValue={land?.unit || "acres"}
      >
        <option value="acres">{t("Acres")}</option>
        <option value="hectares">{t("Hectares")}</option>
        <option value="perches">{t("Perches")}</option>
      </Select>
      <Field
        label={
          land ? t("Replacement sketch (optional)") : t("Land sketch photo or scan")
        }
        name="sketch"
        type="file"
        accept="image/png,image/jpeg,application/pdf"
        required={!land}
      />
      <p className="helper full">
        {t("A photo of a hand-drawn outline is accepted. PNG, JPEG or PDF, up to 5 MB. Each land has a separate record; this is not a certified survey plan.")}</p>
    </>
  );
}
function landData(f: R) {
  return {
    name: f.land_name,
    district: f.land_district,
    village: f.land_village,
    location: f.land_location,
    area: f.land_area,
    unit: f.land_unit,
  };
}
function OrgFields({
  org,
  type,
  setType,
}: {
  org?: R;
  type: string;
  setType: (s: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <>
      <Field
        label={t("Organization / business name")}
        name="org_name"
        required
        defaultValue={org?.name}
      />
      <Select
        label={t("Organization type")}
        name="org_type"
        value={type}
        onChange={(e) => setType(e.target.value)}
      >
        <option value="company">{t("Company")}</option>
        <option value="organization">{t("Organization")}</option>
        <option value="grower">{t("Individual grower")}</option>
        <option value="investor">{t("Individual investor")}</option>
      </Select>
      <Field
        label={t("Business registration number")}
        name="registration_number"
        required={["company", "organization"].includes(type)}
        defaultValue={org?.registration_number}
      />
      <Field
        label={t("Business address")}
        name="org_address"
        required
        maxLength={1000}
        defaultValue={org?.address}
      />
      <Field
        label={t("Business district")}
        name="org_district"
        required
        defaultValue={org?.district}
      />
      <Field
        label={t("Business mobile / telephone")}
        name="org_phone"
        type="tel"
        required
        defaultValue={org?.phone}
      />
      <Field
        label={t("Business email")}
        name="org_email"
        type="email"
        required
        defaultValue={org?.email}
      />
      <Field
        label={t("Responsible person's position")}
        name="responsible_position"
        required
        defaultValue={org?.responsible_position}
      />
    </>
  );
}
function orgData(f: R) {
  return {
    name: f.org_name,
    type: f.org_type,
    registration_number: f.registration_number || "",
    address: f.org_address,
    district: f.org_district,
    phone: f.org_phone,
    email: f.org_email,
    responsible_position: f.responsible_position,
  };
}
async function responseError(r: Response) {
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "Unable to save.");
  return j;
}
export async function signOut() {
  await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "logout" }),
  });
  location.reload();
}
export function RegistrationAuth({ setup }: { setup: boolean }) {
  const [mode, setMode] = useState(setup ? "setup" : "login");
  return <LanguageProvider enabled={mode === "independent"}><RegistrationForm setup={setup} mode={mode} setMode={setMode} /></LanguageProvider>;
}
function RegistrationForm({ setup, mode, setMode }: { setup: boolean; mode: string; setMode: (mode: string) => void }) {
  useEffect(()=>{window.scrollTo(0,0);},[mode]);
  const { t } = useLanguage();
  const { language } = useLanguage();
  const
    [orgType, setOrgType] = useState("company"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget),
      f = Object.fromEntries(form);
    try {
      if (mode === "login" || mode === "setup") {
        await responseError(
          await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...f, action: mode }),
          }),
        );
      } else {
        if (f.password !== f.confirm_password)
          throw new Error("Passwords do not match.");
        const request = new FormData();
        request.set("kind", mode);
        request.set(
          "data",
          JSON.stringify({
            account: {
              language,
              name: f.name,
              mobile: f.mobile,
              email: f.email || "",
              password: f.password,
              district: f.district,
              village: f.village,
            },
            organization: mode === "organization" ? orgData(f) : undefined,
            land: landData(f),
          }),
        );
        request.set("sketch", form.get("sketch")!);
        if (form.get("verification"))
          request.set("verification", form.get("verification")!);
        await responseError(
          await fetch("/api/registration", { method: "POST", body: request }),
        );
      }
      location.reload();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <div
      className={
        "auth registration-auth " +
        (mode === "independent" || mode === "organization" ? "expanded" : "")
      }
    >
      <div className="auth-story">
        <div className="brand">
          <span>
            <Sprout size={24} />
          </span>
          Farm<span className="brand-light">wise</span>
        </div>
        <div>
          <span className="eyebrow">{t("GROW WITH CLARITY")}</span>
          <h1>
            {t("Every season.")}<br />
            {t("Every rupee.")}<br />
            <em>{t("A clearer picture.")}</em>
          </h1>
          <p>
            {t("Self-employed farmers can start immediately. Organizations apply for administrator approval before registering their team.")}</p>
        </div>
        <div className="auth-landscape" aria-hidden="true"><div className="auth-landscape-glow"/><svg viewBox="0 0 420 220" fill="none"><path d="M20 155 185 65 400 135 226 225Z" fill="#365d3d" stroke="#a4bd77" strokeWidth="1.5"/><path d="M20 155 97 113 185 143 105 188Z" fill="#7b9c59"/><path d="m109 106 76-41 98 32-86 44Z" fill="#aac97c"/><path d="m211 146 86-44 103 33-88 45Z" fill="#587e46"/><path d="m119 192 80-44 101 35-74 42Z" fill="#8aa662"/><path d="m44 156 53-29m-34 38 53-29m-34 37 53-29m94-33 48-25m-30 31 48-25m-30 31 48-25m-67 86 43-23m-25 29 43-23m-25 29 43-23" stroke="#d7ee9b" strokeWidth="2" opacity=".5"/><path d="M198 142v-43" stroke="#d7ee9b" strokeWidth="3"/><circle cx="198" cy="82" r="20" fill="#d7ee9b"/><path d="m190 83 6 6 12-13" stroke="#244433" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg><span>{t("From your first land to your next harvest.")}</span></div>
        <div className="auth-benefits"><span><MapPin size={16}/>{t("Multiple land records")}</span><span><ShieldCheck size={16}/>{t("Access suited to your role")}</span><span><Sprout size={16}/>{t("Clear cultivation records")}</span></div>
        <small>
          {t("Private local accounts · multiple lands · accountable records")}</small>
      </div>
      <div className="auth-side">
        <form className="auth-card" onSubmit={submit} key={mode}>
          <div className="auth-form-top"><span className="auth-form-icon" aria-hidden="true">{mode==="organization"?<ShieldCheck size={23}/>:mode==="independent"?<Sprout size={23}/>:<FileText size={23}/>}</span><LanguageSelector /></div>
          <span className="badge">{t("FARM REGISTRATION")}</span>
          <h2>
            {mode === "login"
              ? t("Welcome back")
              : mode === "setup"
                ? t("Set up the administrator")
                : mode === "independent"
                  ? t("Register as a self-employed farmer")
                  : t("Register your organization")}
          </h2>
          <p>
            {mode === "login"
              ? t("Use your registered email or mobile number and password.")
              : mode === "setup"
                ? t("Create the first system administrator. This is a one-time installation step.")
                : mode === "independent"
                  ? t("No administrator approval needed. Register yourself and your first land to get started.")
                  : t("Your application and land details will be reviewed by the system administrator. Organization operations remain locked until approval.")}
          </p>
          <div
            className={mode === "login" || mode === "setup" ? "" : "form-grid"}
          >
            {["independent","organization"].includes(mode)&&<h3 className="full form-subtitle"><span className="auth-step">01</span>{t("Account details")}</h3>}
            {mode === "login" ? (
              <>
                <Field
                  label={t("Email or mobile number")}
                  name="identifier"
                  required
                  autoComplete="username"
                />
                <Field
                  label={t("Password")}
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  maxLength={256}
                />
              </>
            ) : (
              <>
                <Field
                  label={
                    mode === "organization"
                      ? t("Responsible person's full name")
                      : t("Full name")
                  }
                  name="name"
                  required
                />
                {mode !== "setup" && (
                  <>
                    <Field
                      label={t("Mobile number")}
                      name="mobile"
                      type="tel"
                      required
                      placeholder={t("0771234567 or +94771234567")}
                      autoComplete="tel"
                    />
                    <Field label={t("District")} name="district" required />
                    <Field label={t("Village / area")} name="village" required />
                  </>
                )}
                <Field
                  label={
                    mode === "independent"
                      ? t("Email address (optional)")
                      : t("Login email address")
                  }
                  name="email"
                  type="email"
                  required={mode !== "independent"}
                  autoComplete="email"
                />
                <Field
                  label={t("Password (12+ characters)")}
                  name="password"
                  type="password"
                  minLength={12}
                  maxLength={256}
                  autoComplete="new-password"
                  required
                />
                {mode !== "setup" && (
                  <Field
                    label={t("Confirm password")}
                    name="confirm_password"
                    type="password"
                    minLength={12}
                    maxLength={256}
                    autoComplete="new-password"
                    required
                  />
                )}
              </>
            )}
            {mode === "organization" && (
              <>
                <h3 className="full form-subtitle">
                  <span className="auth-step">02</span>{t("Organization verification details")}</h3>
                <OrgFields type={orgType} setType={setOrgType} />
                <Field
                  label={t("Registration document (PNG, JPEG or PDF, up to 5 MB)")}
                  name="verification"
                  type="file"
                  accept="image/png,image/jpeg,application/pdf"
                  required={["company", "organization"].includes(orgType)}
                />
                <p className="helper full">
                  {t("Individual growers or investors without a registered company can apply under their own type and provide supporting information for administrator review.")}</p>
              </>
            )}
            {["independent", "organization"].includes(mode) && (
              <>
                <h3 className="full form-subtitle"><span className="auth-step">{mode==="organization"?"03":"02"}</span>{t("Your first land")}</h3>
                <LandFields />
              </>
            )}
          </div>
          {error && (
            <div className="error" role="alert">
              {t(error)}
            </div>
          )}
          <button disabled={busy} className="button primary wide">
            {busy
              ? t("Please wait…")
              : mode === "login"
                ? t("Sign in")
                : mode === "setup"
                  ? t("Create administrator")
                  : mode === "independent"
                    ? t("Register and start farming")
                    : t("Submit for administrator approval")}
          </button>
          {!setup && (
            <div className="registration-switch">
              {mode === "login" ? (
                <>
                  <p>{t("New to Farmwise?")}</p>
                  <button
                    type="button"
                    className="button"
                    onClick={() => {
                      setMode("independent");
                      setError("");
                    }}
                  >
                    <Sprout size={18} aria-hidden="true"/>{t("Self-employed farmer registration")}</button>
                  <button
                    type="button"
                    className="button"
                    onClick={() => {
                      setMode("organization");
                      setError("");
                    }}
                  >
                    <ShieldCheck size={18} aria-hidden="true"/>{t("Organization / grower / investor registration")}</button>
                </>
              ) : (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                >
                  <ArrowLeft size={14} /> {t("Back to sign in")}</button>
              )}
            </div>
          )}
          <p className="helper">
            {t("Mobile numbers are registered login identifiers. SMS, email verification and cloud services are not connected in this local installation.")}</p>
        </form>
      </div>
    </div>
  );
}
export function LandPanel({
  data,
  onRefresh,
}: {
  data: R;
  onRefresh: () => Promise<void>;
}) {
  const { t } = useLanguage();
  const [edit, setEdit] = useState<R | null | undefined>(undefined),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget),
      vals = Object.fromEntries(f),
      body = new FormData();
    body.set("action", edit ? "edit" : "create");
    if (edit) body.set("id", edit.id);
    body.set("data", JSON.stringify(landData(vals)));
    const sketch = f.get("sketch");
    if (sketch) body.set("sketch", sketch);
    try {
      await responseError(await fetch("/api/lands", { method: "POST", body }));
      await onRefresh();
      setEdit(undefined);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (data.user.role === "supervisor") {
    return <section className="panel"><h2>{t("Land records")}</h2>
      <p>{t("Your organization owner manages land records and private sketches.")}</p></section>;
  }
  return (
    <>
      <div className="section-actions">
        <div>
          <h2>{t("Your land records")}</h2>
          <p>{t("Separate area, location and private sketch for every land.")}</p>
        </div>
        <button
          className="button primary"
          onClick={() => {
            setEdit(null);
            setError("");
          }}
        >
          <Plus size={16} /> {t("Add land")}</button>
      </div>
      {edit !== undefined && (
        <section className="panel">
          <h2>{edit ? t("Edit land record") : t("Register another land")}</h2>
          <form onSubmit={submit} key={edit?.id || "new"}>
            <div className="form-grid">
              <LandFields land={edit || undefined} />
            </div>
            {error && (
              <div className="error" role="alert">
                {t(error)}
              </div>
            )}
            <div className="dialog-actions">
              <button
                type="button"
                className="button"
                onClick={() => setEdit(undefined)}
              >
                {t("Cancel")}</button>
              <button className="button primary" disabled={busy}>
                {busy ? t("Saving…") : t("Save land")}
              </button>
            </div>
          </form>
        </section>
      )}
      <div className="card-grid">
        {data.lands?.map((land: R) => (
          <article className="cultivation-card" key={land.id}>
            <span className="badge">{land.public_id}</span>
            <h2>{land.name}</h2>
            <p>
              <MapPin size={14} /> {land.district} · {land.village}
            </p>
            <p className="land-location">{land.location}</p>
            <strong>
              {land.area} {t(land.unit)}
            </strong>
            <small className="land-conversion">
              {Number(land.acres.toFixed(4))} {t("acres for cultivation calculations")}</small>
            {data.user.role === "admin" && (
              <p className="helper">{t("Owner: ")}{land.owner_name}</p>
            )}
            {(() => {
              const image = data.documents
                ?.filter(
                  (d: R) =>
                    d.land_id === land.id &&
                    d.purpose === "sketch" &&
                    d.mime.startsWith("image/"),
                )
                .sort((a: R, b: R) =>
                  b.created_at.localeCompare(a.created_at),
                )[0];
              return image ? (
                <a
                  href={"/api/documents?id=" + image.id}
                  className="land-sketch-preview"
                >
                  <img
                    src={"/api/documents?id=" + image.id + "&view=1"}
                    alt={t("Land sketch for") + " " + land.name}
                  />
                  <small>{t("Land outline · uploaded sketch")}</small>
                </a>
              ) : null;
            })()}
            <div className="land-documents">
              {data.documents
                ?.filter(
                  (d: R) => d.land_id === land.id && d.purpose === "sketch",
                )
                .map((d: R) => (
                  <a
                    className="receipt-link"
                    href={"/api/documents?id=" + d.id}
                    key={d.id}
                  >
                    <FileText size={13} /> {d.name}
                  </a>
                ))}
            </div>
            <button
              className="button"
              onClick={() => {
                setEdit(land);
                setError("");
              }}
            >
              {t("Edit land")}</button>
          </article>
        ))}
      </div>
      {!data.lands?.length && (
        <div className="panel">
          <p>
            {t("No land records yet. Existing farm records have been preserved. Register each land and its sketch here.")}</p>
        </div>
      )}
    </>
  );
}
export function OrganizationPanel({
  data,
  onRefresh,
}: {
  data: R;
  onRefresh: () => Promise<void>;
}) {
  const { t } = useLanguage();
  const admin = data.user.role === "admin",
    own = data.organizations?.find((o: R) => o.owner_id === data.user.id),
    [editApplication, setEditApplication] = useState(false),
    [orgType, setOrgType] = useState(own?.type || "company"),
    [memberForm, setMemberForm] = useState(false),
    [memberType, setMemberType] = useState("organization_farmer"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function action(body: R) {
    setBusy(true);
    setError("");
    try {
      await responseError(
        await fetch("/api/registration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
      await onRefresh();
      setNotice("Saved. Access rules are up to date.");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function member(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    if (
      await action({
        action: "addMember",
        organization_id: f.organization_id || own?.id,
        data: f,
      })
    )
      setMemberForm(false);
  }
  async function review(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    await action({ action: "reviewOrganization", id, ...f });
  }
  async function resubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    if (await action({ action: "resubmitOrganization", data: orgData(f) }))
      setEditApplication(false);
  }
  async function verification(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    f.set("action", "verification");
    try {
      await responseError(
        await fetch("/api/lands", { method: "POST", body: f }),
      );
      await onRefresh();
      setNotice("Supporting document uploaded.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {error && (
        <div className="error" role="alert">
          {t(error)}
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      {data.organizations?.map((o: R) => (
        <section className="panel" key={o.id}>
          <div className="panel-head">
            <div>
              <h2>{o.name}</h2>
              <p>
                {o.public_id} · {o.type} {t(" · Responsible person:")}{" "}
                {o.responsible_name}
              </p>
            </div>
            <span
              className={
                "badge " + (o.status === "approved" ? "green" : "amber")
              }
            >
              {o.status.replace("_", " ")}
            </span>
          </div>
          <dl className="organization-details">
            <dt>{t("Business address")}</dt>
            <dd>
              {o.address} · {o.district}
            </dd>
            <dt>{t("Business contact")}</dt>
            <dd>
              {o.phone} · {o.email}
            </dd>
            <dt>{t("Responsible position")}</dt>
            <dd>{o.responsible_position}</dd>
            <dt>{t("Registration number")}</dt>
            <dd>{o.registration_number || t("Not applicable / not provided")}</dd>
          </dl>
          {o.review_note && (
            <div className="notice amber-note">
              <p>
                <strong>{t("Administrator feedback")}</strong>
                {o.review_note}
              </p>
            </div>
          )}
          <div className="land-documents">
            {data.documents
              ?.filter(
                (d: R) =>
                  d.organization_id === o.id && d.purpose === "verification",
              )
              .map((d: R) => (
                <a
                  className="receipt-link"
                  href={"/api/documents?id=" + d.id}
                  key={d.id}
                >
                  {d.name}
                </a>
              ))}
          </div>
          {admin && (
            <>
              <p className="helper">
                {t("Review the organization details and its land sketches in Land records. Your decision is recorded in audit history.")}</p>
              <form onSubmit={(e) => review(e, o.id)} className="review-form">
                <Select label={"Decision for " + o.name} name="status">
                  <option value="needs_info">{t("Request more information")}</option>
                  <option value="approved">{t("Approve organization")}</option>
                  <option value="rejected">{t("Reject registration")}</option>
                </Select>
                <Field
                  label={"Review note for " + o.name}
                  name="note"
                  required
                />
                <button disabled={busy} className="button primary">
                  {t("Save review decision")}</button>
              </form>
            </>
          )}
          {!admin && o.status !== "approved" && (
            <>
              <button
                className="button"
                onClick={() => setEditApplication(!editApplication)}
              >
                {t("Update and resubmit application")}</button>
              <form onSubmit={verification} className="review-form">
                <Field
                  label={t("Additional registration document")}
                  name="file"
                  type="file"
                  accept="image/png,image/jpeg,application/pdf"
                  required
                />
                <button className="button" disabled={busy}>
                  {t("Upload supporting document")}</button>
              </form>
            </>
          )}
        </section>
      ))}
      {editApplication && own && (
        <section className="panel">
          <h2>{t("Update organization application")}</h2>
          <form onSubmit={resubmit}>
            <div className="form-grid">
              <OrgFields org={own} type={orgType} setType={setOrgType} />
            </div>
            <button className="button primary" disabled={busy}>
              {t("Resubmit for approval")}</button>
          </form>
        </section>
      )}
      {!admin && own?.status === "approved" && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>{t("Organization farmers & supervisors")}</h2>
              <p>
                {t("Add farmers and supervisors to your approved organization. Farmers view their own expenses; supervisors record expenses against assigned farmer IDs.")}</p>
            </div>
            <button
              className="button primary"
              onClick={() => setMemberForm(!memberForm)}
            >
              {t("Register member")}</button>
          </div>
          {memberForm && (
            <form onSubmit={member}>
              <div className="form-grid">
                <Select
                  label={t("Member category")}
                  name="account_type"
                  value={memberType}
                  onChange={(e) => setMemberType(e.target.value)}
                >
                  <option value="organization_farmer">
                    {t("Farmer — own expenses only")}</option>
                  <option value="supervisor">
                    {t("Supervisor — assigned recording")}</option>
                </Select>
                <Field label={t("Member full name")} name="name" required />
                <Field
                  label={t("Member mobile number")}
                  name="mobile"
                  type="tel"
                  required
                />
                <Field
                  label={t("Member email (optional)")}
                  name="email"
                  type="email"
                />
                <Field label={t("Member district")} name="district" required />
                <Field label={t("Member village / area")} name="village" required />
                <Field
                  label={t("Internal farmer / employee reference (optional)")}
                  name="reference_number"
                />
                <Field
                  label={t("Initial password (12+ characters)")}
                  name="password"
                  type="password"
                  minLength={12}
                  maxLength={256}
                  required
                  autoComplete="new-password"
                />
              </div>
              <p className="helper">
                {t("Share initial credentials securely yourself. No email or SMS invitation is sent.")}</p>
              <button className="button primary" disabled={busy}>
                {t("Create member account")}</button>
            </form>
          )}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("Member / ID")}</th>
                  <th>{t("Category")}</th>
                  <th>{t("Contact")}</th>
                  <th>{t("Access")}</th>
                  <th>{t("Farmer expense total")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.members?.map((m: R) => (
                  <tr key={m.id}>
                    <td>
                      <strong>{m.name}</strong>
                      <small>{m.public_id}</small>
                    </td>
                    <td>
                      {m.account_type === "organization_farmer"
                        ? t("Farmer — expenses only")
                        : t("Supervisor")}
                    </td>
                    <td>
                      {m.mobile}
                      <small>{m.email}</small>
                    </td>
                    <td>{m.active ? t("Active") : t("Inactive")}</td>
                    <td>
                      {m.account_type === "organization_farmer"
                        ? money(
                            (data.entries || [])
                              .filter(
                                (e: R) =>
                                  !e.voided &&
                                  e.kind === "expense" &&
                                  data.expenseFarmers?.some(
                                    (ef: R) =>
                                      ef.entry_id === e.id &&
                                      ef.farmer_id === m.id,
                                  ),
                              )
                              .reduce(
                                (n: number, e: R) => n + e.payload.amount,
                                0,
                              ),
                          )
                        : t("—")}
                    </td>
                    <td>
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() =>
                          action({
                            action: "memberActive",
                            id: m.id,
                            active: !m.active,
                          })
                        }
                      >
                        {m.active ? t("Deactivate") : t("Reactivate")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.cultivations?.length > 0 && (
            <>
              <h3 className="form-subtitle">
                {t("Assign a farmer to a cultivation")}</h3>
              <form
                className="review-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = Object.fromEntries(new FormData(e.currentTarget));
                  await action({ action: "assignFarmer", ...f });
                }}
              >
                <Select label={t("Cultivation for farmer")} name="cultivation_id">
                  <option value="">{t("Choose cultivation")}</option>
                  {data.cultivations.map((c: R) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
                <Select label={t("Organization farmer")} name="farmer_id">
                  <option value="">{t("Choose farmer")}</option>
                  {data.members
                    ?.filter(
                      (m: R) =>
                        m.account_type === "organization_farmer" && m.active,
                    )
                    .map((m: R) => (
                      <option key={m.id} value={m.id}>
                        {m.public_id} · {m.name}
                      </option>
                    ))}
                </Select>
                <button className="button primary" disabled={busy}>
                  {t("Assign farmer")}</button>
              </form>
              {data.farmerAssignments?.map((a: R) => (
                <div
                  className="detail-row"
                  key={a.cultivation_id + a.farmer_id}
                >
                  <span>
                    {a.public_id} · {a.name} ·{" "}
                    {
                      data.cultivations.find(
                        (c: R) => c.id === a.cultivation_id,
                      )?.name
                    }
                  </span>
                  <button
                    className="text-button"
                    onClick={() =>
                      action({
                        action: "assignFarmer",
                        cultivation_id: a.cultivation_id,
                        farmer_id: a.farmer_id,
                        remove: true,
                      })
                    }
                  >
                    {t("Remove assignment")}</button>
                </div>
              ))}
            </>
          )}
          <p className="helper">
            {t("Assign supervisors from the cultivation detail screen. Supervisor access is cultivation-scoped; only assigned farmers in that cultivation can be selected for expense recording.")}</p>
        </section>
      )}
      {!data.organizations?.length && (
        <div className="panel">
          <p>{t("No organization applications have been submitted yet.")}</p>
        </div>
      )}
    </>
  );
}
export function RestrictedPortal({ initial }: { initial: R }) {
  const { t } = useLanguage();
  const [data, setData] = useState(initial),
    [tab, setTab] = useState("application"),
    [error, setError] = useState(""),
    [password, setPassword] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [expenseSearch,setExpenseSearch] = useState("");
  const farmer = data.user.account_type === "organization_farmer";
  async function refresh() {
    await responseError(await fetch("/api/data")).then(setData);
  }
  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await responseError(
        await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...Object.fromEntries(new FormData(e.currentTarget)),
            action: "changePassword",
          }),
        }),
      );
      setPassword(false);
      setNotice("Password changed. Previous sessions revoked.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const expenses = data.entries || [],
    live = expenses.filter((e: R) => !e.voided),
    cash = live
      .filter((e: R) => e.payload.basis === "cash")
      .reduce((s: number, e: R) => s + e.payload.amount, 0),
    imputed = live
      .filter((e: R) => e.payload.basis === "imputed")
      .reduce((s: number, e: R) => s + e.payload.amount, 0);
  return (
    <div className={"restricted-shell " + (farmer ? "farmer-workspace" : "")}>
      <header>
        <div className="brand">
          <span>
            <Sprout size={24} />
          </span>
          Farm<span className="brand-light">wise</span>
        </div>
        <button className="button" onClick={signOut}>
          <LogOut size={15} />
          {t("Sign out")}</button>
      </header>
      <main className="restricted-content">
        <div className="page-heading">
          <div>
            <span className="eyebrow">{data.user.public_id}</span>
            <h1>{farmer ? t("My expenses") : t("Organization application")}</h1>
            <p>
              {data.user.name} ·{" "}
              {data.user.organization_name || t("Organization owner")}
            </p>
          </div>
          <button className="button" onClick={() => setPassword(!password)}>
            {t("Change password")}</button>
        </div>
        {error && (
          <div className="error" role="alert">
            {t(error)}
          </div>
        )}
        {notice && (
          <div className="notice" role="status">
            {notice}
          </div>
        )}
        {password && (
          <form className="panel" onSubmit={changePassword}>
            <div className="form-grid">
              <Field
                label={t("Current password")}
                name="currentPassword"
                type="password"
                required
              />
              <Field
                label={t("New password (12+ characters)")}
                name="password"
                type="password"
                minLength={12}
                maxLength={256}
                required
              />
            </div>
            <button className="button primary" disabled={busy}>
              {t("Update password")}</button>
          </form>
        )}
        {farmer ? (
          <>
            {data.user.organization_status !== "approved" ? (
              <div className="notice amber-note">
                {t("Your organization is not approved for operations. Expense access is currently unavailable.")}</div>
            ) : (
              <>
                <FarmerExpenseOverview user={data.user} expenses={expenses} part="hero" />
                <div className="notice">
                  <ShieldCheck size={20} />
                  <p>
                    {t("You can only view expenses recorded against your farmer ID. Your supervisor records and corrects these expenses.")}</p>
                </div>
                <div className="stats three">
                  <div className="stat">
                    <span>{t("My cash expenses")}</span>
                    <strong>{money(cash)}</strong>
                  </div>
                  <div className="stat">
                    <span>{t("My imputed expenses")}</span>
                    <strong>{money(imputed)}</strong>
                  </div>
                  <div className="stat accent">
                    <span>{t("My total expenses")}</span>
                    <strong>{money(cash + imputed)}</strong>
                  </div>
                </div>
                <FarmerExpenseOverview user={data.user} expenses={expenses} part="breakdown" />
                <section className="panel">
                  <div className="panel-head">
                    <h2>{t("Expenses for ")}{data.user.public_id}</h2>
                    <a className="button" href="/api/export?kind=ledger">
                      {t("Download my expenses")}</a>
                  </div>
                  <div className="farmer-ledger-tools"><label className="field"><span>Search my expenses</span><input value={expenseSearch} onChange={e=>setExpenseSearch(e.target.value)} placeholder="Description, date, category or recorder" /></label><button className="button secondary" disabled={busy} onClick={async()=>{setBusy(true);try{await refresh();setNotice("Expense records refreshed.");setError("");}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>{busy?"Refreshing…":"Refresh expenses"}</button></div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>{t("Date")}</th>
                          <th>{t("Expense / cultivation")}</th>
                          <th>{t("Category")}</th>
                          <th>{t("Amount")}</th>
                          <th>{t("Recorder / receipts")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.filter((e:R)=>[e.date,e.payload.description,e.payload.category,e.cultivation_name,e.recorded_by].join(" ").toLowerCase().includes(expenseSearch.toLowerCase())).map((e: R) => (
                          <tr key={e.id}>
                            <td>{e.date}</td>
                            <td>
                              <strong>{e.payload.description}</strong>
                              <small>
                                {e.cultivation_name}
                                {e.voided ? t(" · Corrected / voided") : ""}
                              </small>
                            </td>
                            <td>
                              {e.payload.category}
                              <small>{e.payload.basis}</small>
                            </td>
                            <td>{money(e.payload.amount)}</td>
                            <td>
                              {e.recorded_by}
                              {data.receipts
                                ?.filter((r: R) => r.entry_id === e.id)
                                .map((r: R) => (
                                  <a
                                    href={"/api/receipts?id=" + r.id}
                                    className="receipt-link"
                                    key={r.id}
                                  >
                                    {r.name}
                                  </a>
                                ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {expenses.length>0 && !expenses.some((e:R)=>[e.date,e.payload.description,e.payload.category,e.cultivation_name,e.recorded_by].join(" ").toLowerCase().includes(expenseSearch.toLowerCase())) && <p className="helper">No expenses match your search.</p>}
                  {!expenses.length && (
                    <p className="helper">
                      {t("No expenses have been recorded against your farmer ID yet.")}</p>
                  )}
                </section>
              </>
            )}
          </>
        ) : (
          <>
            <div className="notice amber-note">
              <ShieldCheck size={20} />
              <p>
                {t("Administrator approval is required before registering farmers, assigning supervisors or using organization operations. You can maintain your application and land records here.")}</p>
            </div>
            <div className="tabs">
              <button
                className={tab === "application" ? "active" : ""}
                onClick={() => setTab("application")}
              >
                {t("Application status")}</button>
              <button
                className={tab === "lands" ? "active" : ""}
                onClick={() => setTab("lands")}
              >
                {t("Land records")}</button>
            </div>
            {tab === "application" ? (
              <OrganizationPanel data={data} onRefresh={refresh} />
            ) : (
              <LandPanel data={data} onRefresh={refresh} />
            )}
            <button className="button" onClick={() => location.reload()}>
              {t("Refresh approval status")}</button>
          </>
        )}
      </main>
    </div>
  );
}
