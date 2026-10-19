"use client";
import { TeamOverview } from "./role-dashboards";
import IndependentOverview from "./independent-overview";
import { useLanguage, LanguageSelector } from "./language";
import { ProfilePanel } from "./profile-panel";
import { LandPanel, OrganizationPanel } from "./registration-ui";
import { useEffect, useRef, useState, FormEvent } from "react";
import {
  Sprout,
  LayoutDashboard,
  Tractor,
  Receipt,
  Leaf,
  ChartNoAxesCombined,
  Lightbulb,
  Settings,
  LogOut,
  Plus,
  ArrowUpRight,
  ArrowLeft,
  Menu,
  X,
  Download,
  Users,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Search,
  ClipboardList,
  History,
  MapPin,
  ChevronRight,
  FileText,
  Package,
  Coins,
} from "lucide-react";
import { defaultHistoricalProduct, historySelection, priceChartGeometry, matchesCrop, historicalProductOptions } from "@/lib/price-history";
import { totals, scenario, priceEligible } from "@/lib/domain";
type R = Record<string, any>;
const accountLabel = (u: R) => ({
  independent: "Self-employed farmer", organization_farmer: "Organization farmer",
  organization_owner: "Organization owner", supervisor: "Supervisor", admin: "System administrator",
  farmer: "Self-employed farmer", grower: "Organization owner",
} as R)[u.account_type || u.role] || u.role;
const formatMoney = (c: number | null | undefined) =>
  c == null
    ? "Insufficient data"
    : new Intl.NumberFormat("en-LK", {
        style: "currency",
        currency: "LKR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(c / 100);
const number = (n: number) =>
  new Intl.NumberFormat("en-LK", { maximumFractionDigits: 3 }).format(n);
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const categories = [
  "Seeds",
  "Fertilizer",
  "Chemicals",
  "Labour",
  "Irrigation",
  "Machinery",
  "Transport",
  "Harvesting",
  "Land",
  "Other",
];
const pages = [
  ["dashboard", "Overview", LayoutDashboard],
  ["cultivations", "Cultivations", Tractor],
  ["lands", "Land records", MapPin],
  ["organization", "Organization & people", Users],
  ["activities", "Activities & labour", ClipboardList],
  ["expenses", "Expenses & receipts", Receipt],
  ["funding", "Funding & budgets", Wallet],
  ["harvests", "Harvests & sales", Leaf],
  ["market", "Historical prices", ChartNoAxesCombined],
  ["decisions", "Decision support", Lightbulb],
  ["reports", "Reports & exports", FileText],
  ["settings", "Administration", Settings],
] as const;
export default function Workspace({
  initial,
  setup,
  historical,
}: {
  initial: R | null;
  setup: boolean;
  historical: R[];
}) {
  const { t } = useLanguage();
  const money = (value: number | null | undefined) => t(formatMoney(value));
  const [data, setData] = useState<R | null>(initial),
    [page, setPage] = useState("dashboard"),
    [selected, setSelected] = useState("all"),
    [menu, setMenu] = useState(false),
    [modal, setModal] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [query, setQuery] = useState(""),
    [harvestTab, setHarvestTab] = useState("harvest"),
    [recordId, setRecordId] = useState("");
  const [marketSelection, setMarketSelection] = useState<{scope: string; product: string} | null>(null),
    [market, setMarket] = useState("all"),
    [showFlagged, setShowFlagged] = useState(false),
    [marketPage, setMarketPage] = useState(0),
    [scenarioPrice, setScenarioPrice] = useState("60"),
    [scenarioYield, setScenarioYield] = useState(""),
    [remaining, setRemaining] = useState("0");
  const modalRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (modal) {
      modalRef.current?.showModal();
      setError("");
    } else modalRef.current?.close();
  }, [modal]);
  useEffect(() => {
    if (!menu) return;
    document.querySelector<HTMLButtonElement>(".close-nav")?.focus();
    const handle = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      document.querySelector<HTMLButtonElement>(".mobile-menu")?.focus();
    };
  }, [menu]);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 5000);
      return () => clearTimeout(t);
    }
  }, [notice]);
  async function refresh() {
    const r = await fetch("/api/data");
    const j = await r.json();
    if (!r.ok) {
      if (r.status === 401) location.reload();
      throw new Error(j.error);
    }
    setData(j);
  }
  async function write(body: R) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
        j = await r.json();
      if (!r.ok) throw new Error(j.error);
      await refresh();
      setModal(null);
      setNotice("Saved. Your totals are up to date.");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const r = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...f, action: setup ? "setup" : "login" }),
        }),
        j = await r.json();
      if (!r.ok) throw new Error(j.error);
      location.reload();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  async function logout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    location.reload();
  }
  function open(kind: string, id = "") {
    if (kind === "expense" && data?.user.account_type === "organization_owner") {
      setError("Assigned supervisors record expenses against your farmers. You can review their records and totals here.");
      return;
    }
    setRecordId(id);
    setModal(kind);
    setMenu(false);
  }
  function go(p: string) {
    setPage(p);
    setQuery("");
    setError("");
    setMenu(false);
  }
  if (!data)
    return (
      <div className="auth">
        <div className="auth-story">
          <Brand />
          <div>
            <span className="eyebrow">{t("GROW WITH CLARITY")}</span>
            <h1>
              {t("Every season.")}<br />
              {t("Every rupee.")}<br />
              <em>{t("A clearer picture.")}</em>
            </h1>
            <p>
              {t("Your field records, finances and harvests in one place. Make the next decision with the numbers in front of you.")}</p>
            <div className="auth-pills">
              <span>
                <Leaf size={16} /> {t("Six initial crops")}</span>
              <span>
                <Wallet size={16} /> {t("Transparent costs")}</span>
            </div>
          </div>
          <small>{t("Farm Cost Monitoring & Decision Support")}</small>
        </div>
        <div className="auth-side">
          <form onSubmit={login} className="auth-card">
            <span className="badge">{t("LOCAL INSTALLATION")}</span>
            <h2>{setup ? t("Let’s set up your workspace") : t("Welcome back")}</h2>
            <p>
              {setup
                ? t("Create the first administrator account. You can then add farmers, growers and supervisors.")
                : t("Sign in to your Farmwise account.")}
            </p>
            {setup && (
              <Field
                label={t("Your name")}
                name="name"
                required
                autoComplete="name"
              />
            )}
            <Field
              label={t("Email address")}
              name="email"
              type="email"
              required
              autoComplete="email"
            />
            <Field
              label={t("Password")}
              name="password"
              type="password"
              minLength={setup ? 12 : 1}
              maxLength={256}
              required
              autoComplete={setup ? "new-password" : "current-password"}
            />
            {setup && (
              <small>
                {t("Use at least 12 characters. Keep your password somewhere safe.")}</small>
            )}
            {error && (
              <div className="error" role="alert">
                {t(error)}
              </div>
            )}
            <button className="button primary wide" disabled={busy}>
              {busy ? t("Please wait…") : setup ? t("Create workspace") : t("Sign in")}
              <ArrowUpRight size={17} />
            </button>
            <div className="auth-note">
              <CheckCircle2 size={18} />
              <span>
                {t("Real local accounts and persistent storage.")}<br />
                {t("Supabase and cloud access are not connected.")}</span>
            </div>
          </form>
        </div>
      </div>
    );
  const user = data.user,
    admin = user.role === "admin",
    owner = user.role !== "supervisor";
  const cultivations = data.cultivations as R[],
    cs = cultivations.filter((c) => selected === "all" || c.id === selected),
    c = selected === "all" ? null : cultivations.find((c) => c.id === selected),
    entries = (data.entries as R[]).filter(
      (e) => selected === "all" || e.cultivation_id === selected,
    ),
    live = entries.filter((e) => !e.voided),
    summary = totals(entries as any),
    budget = cs.reduce((s, c) => s + c.budget, 0),
    usage = budget ? (summary.cash / budget) * 100 : 0;
  const canManage = !!c && (admin || c.owner_id === user.id);
  const organizationCultivation = !!c && !!(user.organization_id ||
    data.organizations?.some((o: R) => o.owner_id === c.owner_id));
  const editFarm = data.farms.find((f: R) => f.id === recordId),
    editField = data.fields.find((f: R) => f.id === recordId),
    editCrop = data.crops.find((f: R) => f.id === recordId),
    resetUser = data.users.find((u: R) => u.id === recordId);

  const selectedEntries = (kind: string) =>
    (data.entries as R[]).filter(
      (e) => !e.voided && e.cultivation_id === (c?.id || "") && e.kind === kind,
    );
  const filtered = (kind: string) =>
    live.filter(
      (e) =>
        e.kind === kind &&
        (
          JSON.stringify(e.payload) +
          " " +
          (data.expenseFarmers || [])
            .filter((f: R) => f.entry_id === e.id)
            .map((f: R) => f.public_id + " " + f.name)
            .join(" ")
        )
          .toLowerCase()
          .includes(query.toLowerCase()),
    );
  const roleWorkspace = user.role === "supervisor" || user.account_type === "organization_owner";
  const title = page === "settings" && roleWorkspace ? "Account settings" : page === "settings" && user.account_type === "independent" ? "My profile & settings" : pages.find((p) => p[0] === page)?.[1] || "Overview";
  const inputSelect = (
    label: string,
    name: string,
    options: R[],
    key = "name",
    value = "id",
    required = true,
  ) => (
    <label className="field">
      <span>{t(label as string)}</span>
      <select
        aria-label={t(label as string)}
        name={name}
        required={required}
        defaultValue=""
      >
        <option value="" disabled>
          {t("Choose")} {t(label)}
        </option>
        {options.map((o) => (
          <option key={o[value]} value={o[value]}>
            {name === "crop_id" ? t(o[key]) : o[key]}
          </option>
        ))}
      </select>
    </label>
  );
  const cultivationSelect = () =>
    inputSelect(
      "Cultivation",
      "cultivation_id",
      cultivations.filter((x) => x.status !== "closed"),
      "name",
    );
  function recordRows(kind: string) {
    return filtered(kind).map((e) => {
      const p = e.payload,
        cv = cultivations.find((c) => c.id === e.cultivation_id);
      return (
        <tr key={e.id}>
          <td>
            <strong>{p.description || p.buyer || t(p.method || "")}</strong>
            <small>{cv?.name}</small>
            {kind === "expense" &&
              data!.expenseFarmers
                ?.filter((f: R) => f.entry_id === e.id)
                .map((f: R) => (
                  <small key={f.farmer_id}>
                    {f.public_id} · {f.name}
                  </small>
                ))}
          </td>
          <td>{e.date}</td>
          {kind === "activity" ? (
            <>
              <td>
                <Badge>{t(p.category)}</Badge>
              </td>
              <td>
                {number(p.quantity)} {p.unit}
              </td>
              <td>{p.notes || t("—")}</td>
            </>
          ) : kind === "expense" ? (
            <>
              <td>
                {t(p.category)}
                <small>
                  {p.basis === "imputed" ? t("Imputed · noncash") : t("Cash cost")}
                </small>
              </td>
              <td>{money(p.amount)}</td>
              <td>
                {(data!.receipts as R[])
                  .filter((r) => r.entry_id === e.id)
                  .map((r) => (
                    <a
                      className="receipt-link"
                      key={r.id}
                      href={"/api/receipts?id=" + r.id}
                    >
                      {r.name}
                    </a>
                  ))}
                <button
                  className="text-button"
                  disabled={user.account_type === "organization_owner"}
                  onClick={() => open("receipt", e.id)}
                >
                  {t("Attach receipt")}</button>
              </td>
            </>
          ) : kind === "investment" ? (
            <>
              <td>{p.investor}</td>
              <td>{money(p.amount)}</td>
            </>
          ) : kind === "harvest" ? (
            <>
              <td>
                <Badge>{p.grade}</Badge>
              </td>
              <td>{number(p.total)} {t(" kg")}</td>
              <td>
                {number(p.saleable)} {t(" kg")}<small>{number(p.loss)} {t(" kg loss")}</small>
              </td>
            </>
          ) : kind === "sale" ? (
            <>
              <td>
                {number(p.kg)} {t(" kg")}<small>{money(p.price)} {t(" / kg")}</small>
              </td>
              <td>{money(Math.round(p.kg * p.price))}</td>
              <td>
                {money(
                  Math.round(p.kg * p.price) -
                    live
                      .filter(
                        (x) =>
                          x.kind === "payment" && x.payload.sale_id === e.id,
                      )
                      .reduce((s, x) => s + x.payload.amount, 0),
                )}
                <small>{t("Outstanding")}</small>
              </td>
            </>
          ) : (
            <>
              <td>{p.reference || t("—")}</td>
              <td>{money(p.amount)}</td>
              <td>
                {live.find((x) => x.id === p.sale_id)?.payload.buyer || t("Sale")}
              </td>
            </>
          )}
          <td>
            <button
              className="text-button muted"
              disabled={
                kind === "expense" && user.account_type === "organization_owner"
              }
              onClick={() => open("void", e.id)}
            >
              {t("Correct")}</button>
          </td>
        </tr>
      );
    });
  }
  function ledger(kind: string, headers: string[]) {
    return (
      <>
        <div className="toolbar">
          <label className="search">
            <Search size={17} />
            <input
              aria-label={t("Search records")}
              placeholder={t("Search records…")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <span>{filtered(kind).length} {t(" records")}</span>
        </div>
        <Table headers={headers}>{recordRows(kind)}</Table>
        {!filtered(kind).length && (
          <Empty
            title={query ? t("No matching records") : t("No records yet")}
            description={query
              ? t("Try another search or clear it to see your records.")
              : kind === "expense" && user.account_type === "organization_owner"
                ? t("Assigned supervisors record expenses against your farmers. Their records and totals will appear here.")
                : kind === "investment" && !owner
                  ? t("Your organization owner records funding. You can review funding for your assigned cultivations here.")
                  : t("Add your first record. Calculations will update as you record actual activity.")}
            action={query
              ? () => setQuery("")
              : (kind === "investment" && !owner) ||
                  (kind === "expense" && user.account_type === "organization_owner")
                ? undefined : () => open(kind)}
            label={query ? t("Clear search") : t("Add record")}
          />
        )}
      </>
    );
  }
  async function saveForm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as R;
    if (modal === "receipt") {
      setBusy(true);
      setError("");
      const fd = new FormData(e.currentTarget);
      fd.set("entry_id", recordId);
      try {
        const r = await fetch("/api/receipts", { method: "POST", body: fd }),
          j = await r.json();
        if (!r.ok) throw new Error(j.error);
        await refresh();
        setModal(null);
        setNotice("Receipt attached securely.");
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (modal === "password" || modal === "resetPassword") {
      setBusy(true);
      setError("");
      try {
        const r = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...f,
            action: modal === "password" ? "changePassword" : "resetPassword",
            user_id: recordId,
          }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        setModal(null);
        setNotice("Password updated. Previous sessions have been revoked.");
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (
      ["editFarm", "editField", "editCrop", "editCultivation"].includes(
        modal || "",
      )
    ) {
      await write({
        action: modal,
        id: recordId,
        cultivation_id: c?.id,
        data: f,
      });
      return;
    }
    if (modal === "void") {
      await write({ action: "void", id: recordId, reason: f.reason });
      return;
    }
    if (modal === "assign") {
      await write({
        action: "assign",
        cultivation_id: c?.id,
        user_id: f.user_id,
      });
      return;
    }
    if (modal === "budget") {
      await write({ action: "updateCultivation", cultivation_id: c?.id, ...f });
      return;
    }
    if (modal === "area") f.approved = f.approved === "true";
    if (modal === "farm" && !admin) f.owner_id = user.id;
    await write({
      kind: modal,
      cultivation_id: f.cultivation_id || c?.id,
      date: f.date,
      data: f,
    });
  }
  const priceCultivation = c || (cultivations.length === 1 ? cultivations[0] : null);
  const marketScope = priceCultivation?.id || "all";
  const marketCrop = marketSelection && marketSelection.scope === marketScope
    ? marketSelection.product : defaultHistoricalProduct(historical, priceCultivation?.crop || "Watermelon", market);
  const products = historicalProductOptions(historical, priceCultivation?.crop || "Watermelon", market, marketCrop);
  const priceHistory = historySelection(historical, marketCrop, market);
  const marketRows = priceHistory.records, chartRows = priceHistory.usable;
  // When nothing can be charted, show the original evidence by default.
  const visiblePrices = marketRows.filter((p) => showFlagged || !chartRows.length || priceEligible(p));
  const unitCostLabel = cs.length > 0 && cs.every(x => x.status === "closed") ? "Final cost per kg" : "Cost per kg so far";
  const targetYield = Math.max(0, Number(scenarioYield || c?.forecast_kg || 0)),
    proj = scenario(
      summary.cost,
      Math.max(0, Number(remaining)) * 100,
      targetYield,
      Math.max(0, Number(scenarioPrice)) * 100,
    );
  return (
    <div className={"shell " + (roleWorkspace ? "team-workspace" : user.account_type === "independent" ? "team-workspace independent-workspace" : "")}>
      {menu && (
        <button
          className="scrim"
          aria-label={t("Close navigation backdrop")}
          onClick={() => setMenu(false)}
        />
      )}
      <aside
        id="workspace-navigation"
        className={"sidebar " + (menu ? "open" : "")}
      >
        <Brand />
        <button
          className="close-nav"
          aria-label={t("Close navigation")}
          onClick={() => setMenu(false)}
        >
          <X />
        </button>
        <div className="workspace-label">{t("FARM WORKSPACE")}</div>
        <nav aria-label={t("Main navigation")}>
          {pages
            .filter(
              ([id]) =>
                (id !== "organization" || admin || user.account_type === "organization_owner") &&
                (id !== "lands" || user.role !== "supervisor"),
            )
            .map(([id, label, Icon], i) => (
              <div key={id}>
                {i === 6 && (
                  <div className="workspace-label analysis-label">
                    {t("INSIGHTS & TOOLS")}</div>
                )}
                <button
                  className={page === id ? "active" : ""}
                  onClick={() => go(id)}
                >
                  <Icon size={18} />
                  {t(id === "settings" && roleWorkspace ? "Account settings" : id === "settings" && user.account_type === "independent" ? "My profile & settings" : label as string)}
                  {id === "cultivations" && <b>{cultivations.length}</b>}
                </button>
              </div>
            ))}
        </nav>
        <div className="sidebar-foot">
          <div className="local-status">
            <i /> {t(" Local workspace ")}<span>{t("Persistent data")}</span>
          </div>
          <div className="user">
            <span className="avatar">
              {user.name
                .split(" ")
                .map((s: string) => s[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>
                {t(accountLabel(user))}
              </small>
            </div>
            <button aria-label={t("Sign out")} onClick={logout}>
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <a className="skip-link" href="#workspace-content">
        {t("Skip to content")}</a>
      <main inert={menu ? true : undefined} id="workspace-content">
        <header className="topbar">
          <button
            className="mobile-menu"
            aria-label={t("Open navigation")}
            aria-expanded={menu}
            aria-controls="workspace-navigation"
            onClick={() => setMenu(true)}
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            {t("Workspace")}<ChevronRight size={14} />
            <strong>{t(title)}</strong>
          </div>
          <div className="top-actions">
            <LanguageSelector />
            <span className="today">
              {new Intl.DateTimeFormat("en-GB", {
                timeZone: "Asia/Colombo",
                day: "numeric",
                month: "short",
                year: "numeric",
              }).format(new Date()).replace(/\b[A-Za-z]{3}\b/g, (month) => t(month))}
            </span>
            <button className="button primary" onClick={() => open("choose")}>
              <Plus size={17} />
              <span>{t("Add record")}</span>
            </button>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {page === "dashboard"
                  ? t("YOUR SEASON, AT A GLANCE")
                  : "FARMWISE / " + t(title)}
              </div>
              <h1>
                {page === "dashboard" ? roleWorkspace ? user.role === "supervisor" ? "Supervisor overview" : "Organization overview" : t("A clearer view of your farm.") : t(title)}
              </h1>
              <p>
                {page === "dashboard"
                  ? t("Follow the work, understand the costs, plan what comes next.")
                  : page === "market"
                    ? t("Original price-list ranges. Historical context for your next decision.")
                    : page === "decisions"
                      ? t("Understand the calculation, the assumptions and the limits.")
                      : t("A dependable record of each season, from field to sale.")}
              </p>
            </div>
            {page !== "settings" && (
              <label className="scope-select">
                <span>{t("Cultivation")}</span>
                <select
                  value={selected}
                  onChange={(e) => {
                    setSelected(e.target.value);
                    setScenarioYield("");
                    setError("");
                  }}
                >
                  <option value="all">{t("All accessible cultivations")}</option>
                  {cultivations.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {error && !modal && (
            <div className="error" role="alert">
              {t(error)}
            </div>
          )}
          {page === "dashboard" && (
            <>
              {user.account_type === "independent" && <IndependentOverview data={data} cultivations={cs} onExpense={()=>open("expense")} onLands={()=>go("lands")} onCultivations={()=>go("cultivations")} />}
              {roleWorkspace && <TeamOverview data={data} cultivations={cs} onPeople={()=>go("organization")} onCultivations={()=>go("cultivations")} onExpense={()=>open("expense")} />}
              {!cultivations.length && (
                <div className="welcome-banner">
                  <div className="welcome-symbol">
                    <Sprout size={32} />
                  </div>
                  <div>
                    <h2>{t("Your next season starts here.")}</h2>
                    <p>
                      {owner
                        ? data.fields.length
                          ? t("Your land and field are ready. Start your first cultivation, then record your daily work and costs.")
                          : t("Register your land and set up a field, then start your first cultivation.")
                        : t("Your assigned cultivations will appear here when an owner adds you as a supervisor.")}
                    </p>
                  </div>
                  {owner && (
                    <button
                      className="button"
                      onClick={() =>
                        open(
                          !data.farms.length
                            ? "farm"
                            : !data.fields.length
                              ? "field"
                              : "cultivation",
                        )
                      }
                    >
                      {data.fields.length ? t("Start your first cultivation") : t("Set up your farm")} <ArrowUpRight size={16} />
                    </button>
                  )}
                </div>
              )}
              <div className="stats">
                <Stat
                  label={t("Cash cultivation costs")}
                  value={money(summary.cash)}
                  note={
                    summary.imputed
                      ? `${money(summary.imputed)} ${t("additional imputed cost")}`
                      : t("Actual cash costs, recorded once")
                  }
                  icon={<Receipt size={19} />}
                />
                <Stat
                  label={t("Sales revenue")}
                  value={money(summary.revenue)}
                  note={`${money(summary.payments)} ${t("payments received")}`}
                  icon={<Coins size={19} />}
                />
                <Stat
                  label={t("Economic profit / loss")}
                  value={money(summary.profit)}
                  note={t("Sales less cash and imputed costs")}
                  accent
                  icon={<ChartNoAxesCombined size={19} />}
                />
                <Stat
                  label={t("Budget remaining")}
                  value={money(budget - summary.cash)}
                  note={
                    budget
                      ? `${Math.round(usage)}% ${t("of cash budget used")}`
                      : t("Set a budget for meaningful alerts")
                  }
                  icon={<Wallet size={19} />}
                />
              </div>
              {priceCultivation && <CultivationPriceHistory key={priceCultivation.id} crop={priceCultivation.crop} historical={historical} />}
              <div className="dashboard-grid">
                <section className="panel">
                  <PanelHead
                    title={t("Your cultivations")}
                    sub={t("A living picture of the season")}
                    action={
                      <button
                        className="text-button"
                        onClick={() => go("cultivations")}
                      >
                        {t("View all")}<ArrowUpRight size={15} />
                      </button>
                    }
                  />
                  {cs.length ? (
                    <div className="cultivation-list">
                      {cs.slice(0, 4).map((x) => (
                        <button
                          className="cultivation-row"
                          key={x.id}
                          onClick={() => {
                            setSelected(x.id);
                            go("cultivations");
                          }}
                        >
                          <span className={"crop-icon " + x.crop.toLowerCase()}>
                            <Sprout size={24} />
                          </span>
                          <div>
                            <strong>{x.name}</strong>
                            <small>
                              {t(x.crop)} · {x.field} · {number(x.acres)} {t("acres")}</small>
                          </div>
                          <div className="row-right">
                            <Badge
                              tone={x.status === "closed" ? "neutral" : "green"}
                            >
                              {t(x.status)}
                            </Badge>
                            <small>{money(x.summary.cash)} {t(" spent")}</small>
                          </div>
                          <ChevronRight size={16} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      title={owner ? t("Room for your first cultivation") : t("Awaiting cultivation assignment")}
                      description={owner
                        ? t("Start with your field and crop. No sample farm data is included.")
                        : t("Your organization owner must assign a cultivation before you can record work.")}
                    />
                  )}
                </section>
                <section className="panel">
                  <PanelHead
                    title={t("Where your money goes")}
                    sub={t("Actual costs · cash and imputed")}
                  />
                  <CostChart entries={live} />
                </section>
              </div>
              <div className="dashboard-grid">
                <section className="panel">
                  <PanelHead
                    title={t("A little foresight")}
                    sub={t("Signals from your own records")}
                  />
                  <div className="insight">
                    <span className="insight-icon">
                      <Lightbulb size={21} />
                    </span>
                    <div>
                      <strong>
                        {usage >= 100
                          ? t("Cash budget exceeded")
                          : usage >= 80
                            ? t("Your budget needs a closer look")
                            : t("Keep the season in perspective")}
                      </strong>
                      <p>
                        {budget
                          ? `${money(summary.cash)} / ${money(budget)} · ${t("Cash budget recorded. Review remaining work before committing more spending.")}`
                          : owner
                            ? t("Set cultivation budgets to see spending alerts. Record forecast yield to explore revenue scenarios.")
                            : t("Your organization owner sets cultivation budgets. Assigned budgets and spending alerts will appear here.")}
                      </p>
                      <button
                        className="text-button"
                        onClick={() => go("decisions")}
                      >
                        {t("Explore decision support")}<ArrowUpRight size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="mini-metrics">
                    <div>
                      <small>{t("Saleable harvest")}</small>
                      <strong>{number(summary.saleable)} {t(" kg")}</strong>
                    </div>
                    <div>
                      <small>{t("Unsold harvest")}</small>
                      <strong>{number(summary.stock)} {t(" kg")}</strong>
                    </div>
                    {summary.saleable > 0 && <div>
                      <small>{t(unitCostLabel)}</small>
                      <strong>{money(summary.costPerKg)}</strong>
                    </div>}
                  </div>
                </section>
                <section className="panel">
                  <PanelHead
                    title={t("Recent records")}
                    sub={t("The latest work, as it happens")}
                  />
                  {live.slice(0, 4).map((e) => (
                    <div className="recent" key={e.id}>
                      <span>
                        <ClipboardList size={17} />
                      </span>
                      <div>
                        <strong>
                          {e.payload.description ||
                            e.payload.buyer ||
                            t(e.payload.method || "")}
                        </strong>
                        <small>
                          {t(e.kind)} · {e.date}
                        </small>
                      </div>
                      <b>
                        {e.payload.amount
                          ? money(e.payload.amount)
                          : e.payload.kg
                            ? number(e.payload.kg) + " " + t("kg")
                            : e.payload.total
                              ? number(e.payload.total) + " " + t("kg")
                              : ""}
                      </b>
                    </div>
                  ))}
                  {!live.length && (
                    <Empty
                      title={t("A fresh page")}
                      description={t("Activities, costs, harvests and sales appear here as you add them.")}
                    />
                  )}
                </section>
              </div>
              <div className="footnote">
                <CheckCircle2 size={16} /> {t("Based on your recorded actuals. Funding, imputed costs and forecasts stay separate.")}</div>
            </>
          )}
          {page === "cultivations" && (
            <>
              <div className="section-actions">
                <p>
                  {cultivations.length} {t("accessible cultivations · personal calculations in every district")}</p>
                {owner && (
                  <div>
                    <button className="button" onClick={() => go("lands")}>
                      {t("Register land")}</button>
                    <button className="button" onClick={() => open("field")}>
                      {t("Add field")}</button>
                    <button
                      className="button primary"
                      onClick={() => open("cultivation")}
                    >
                      <Plus size={16} />
                      {t("New cultivation")}</button>
                  </div>
                )}
              </div>
              {c ? (
                <>
                  <button
                    className="text-button"
                    onClick={() => setSelected("all")}
                  >
                    <ArrowLeft size={15} /> {t("All cultivations")}</button>
                  <section className="cultivation-hero">
                    <div>
                      <Badge>{t(c.status)}</Badge>
                      <h2>{c.name}</h2>
                      <p>
                        {t(c.crop)} · {c.variety} · {c.farm} / {c.field}
                      </p>
                      <span>
                        <MapPin size={16} />
                        {c.district} · {number(c.acres)} {t("acres (")}{number(c.acres * 0.404685642)} {t("ha)")}</span>
                    </div>
                    <div>
                      <small>{t("Expected harvest")}</small>
                      <strong>{c.harvest_date}</strong>
                      <small>{t("Planted ")}{c.planted}</small>
                    </div>
                  </section>
                  <div className={c.summary.saleable > 0 ? "stats" : "stats three"}>
                    <Stat
                      label={t("Economic cost")}
                      value={money(c.summary.cost)}
                      note={t("Cash + imputed costs")}
                    />
                    <Stat
                      label={t("Sales revenue")}
                      value={money(c.summary.revenue)}
                      note={t("Agreed sale value")}
                    />
                    <Stat
                      label={t("Budget")}
                      value={money(c.budget)}
                      note={`${number(c.forecast_kg)} ${t("kg forecast yield")}`}
                    />
                    {c.summary.saleable > 0 && <Stat
                      label={t(c.status === "closed" ? "Final cost per kg" : "Cost per kg so far")}
                      value={money(c.summary.costPerKg)}
                      note={t("Uses actual saleable harvest")}
                    />}
                  </div>
                  <CultivationPriceHistory key={c.id} crop={c.crop} historical={historical} />
                  <div className="dashboard-grid">
                    <section className="panel">
                      <PanelHead
                        title={t("Cultivation controls")}
                        sub={t("Ownership and sensitive settings")}
                      />
                      <div className="detail-row">
                        <span>{t("Benchmark policy")}</span>
                        <Badge tone={c.approved ? "green" : "amber"}>
                          {c.approved
                            ? t("Approved area")
                            : t("Outside reference area")}
                        </Badge>
                      </div>
                      <div className="detail-row">
                        <span>{t("Record validation")}</span>
                        <Badge tone={c.validated ? "green" : "neutral"}>
                          {c.validated ? t("Validated") : t("Not validated")}
                        </Badge>
                      </div>
                      <p className="helper">
                        {t("Personal calculations are always available. Benchmark inclusion also needs closure, administrator validation and enough independent records.")}</p>
                      {canManage && (
                        <button
                          className="button"
                          onClick={() => open("editCultivation")}
                        >
                          {t("Edit cultivation details")}</button>
                      )}
                      {canManage && (
                        <button
                          className="button"
                          onClick={() => open("budget")}
                        >
                          {t("Edit budget, forecast & status")}</button>
                      )}
                      {admin && (
                        <button
                          className="button"
                          onClick={() =>
                            write({
                              action: "validate",
                              cultivation_id: c.id,
                              validated: !c.validated,
                            })
                          }
                        >
                          {c.validated
                            ? t("Revoke validation")
                            : t("Validate closed cultivation")}
                        </button>
                      )}
                    </section>
                    {organizationCultivation && (
                    <section className="panel">
                      <PanelHead
                        title={t("Assigned supervisors")}
                        sub={t("Access is limited to this cultivation")}
                        action={
                          canManage &&
                          (admin ||
                            user.account_type === "organization_owner") && (
                            <button
                              className="button"
                              onClick={() => open("assign")}
                            >
                              <Plus size={15} /> {t("Assign")}</button>
                          )
                        }
                      />
                      {data.assignments
                        .filter((a: R) => a.cultivation_id === c.id)
                        .map((a: R) => (
                          <div className="detail-row" key={a.user_id}>
                            <span>{a.name}</span>
                            {canManage && (
                              <button
                                className="text-button"
                                onClick={() =>
                                  write({
                                    action: "assign",
                                    cultivation_id: c.id,
                                    user_id: a.user_id,
                                    remove: true,
                                  })
                                }
                              >
                                {t("Remove access")}</button>
                            )}
                          </div>
                        ))}
                      {!data.assignments.some(
                        (a: R) => a.cultivation_id === c.id,
                      ) && (
                        <p className="helper">
                          {t("No supervisors assigned. Owners and administrators can access the records.")}</p>
                      )}
                    </section>
                    )}
                  </div>
                  <section className="panel">
                    <PanelHead
                      title={t("Season record")}
                      sub={t("All live entries in this cultivation")}
                    />
                    <Table headers={["Date", "Type", "Description", "Value"]}>
                      {live.map((e) => (
                        <tr key={e.id}>
                          <td>{e.date}</td>
                          <td>
                            <Badge>{t(e.kind)}</Badge>
                          </td>
                          <td>
                            {e.payload.description ||
                              e.payload.buyer ||
                              t(e.payload.method || "")}
                          </td>
                          <td>
                            {e.payload.amount != null
                              ? money(e.payload.amount)
                              : e.kind === "harvest"
                                ? number(e.payload.total) + " " + t("kg harvested")
                                : e.payload.kg != null
                                  ? number(e.payload.kg) + " " + t("kg")
                                  : e.payload.quantity != null
                                    ? number(e.payload.quantity) + " " + e.payload.unit
                                    : t("—")}
                          </td>
                        </tr>
                      ))}
                    </Table>
                  </section>
                </>
              ) : (
                <div className="card-grid">
                  {cultivations.map((x) => (
                    <article className="cultivation-card" key={x.id}>
                      <div className="card-top">
                        <span className="crop-icon">
                          <Sprout size={26} />
                        </span>
                        <Badge
                          tone={x.status === "closed" ? "neutral" : "green"}
                        >
                          {t(x.status)}
                        </Badge>
                      </div>
                      <h2>{x.name}</h2>
                      <p>
                        {t(x.crop)} · {x.variety}
                      </p>
                      <div className="card-location">
                        <MapPin size={14} />
                        {x.district} · {x.field}
                      </div>
                      <div className="card-numbers">
                        <div>
                          <small>{t("Area")}</small>
                          <strong>{number(x.acres)} {t(" acres")}</strong>
                        </div>
                        <div>
                          <small>{t("Cash spent")}</small>
                          <strong>{money(x.summary.cash)}</strong>
                        </div>
                      </div>
                      <div className="budget-track">
                        <i
                          style={{
                            width:
                              Math.min(
                                100,
                                x.budget
                                  ? (x.summary.cash / x.budget) * 100
                                  : 0,
                              ) + "%",
                          }}
                        />
                      </div>
                      <div className="card-bottom">
                        <small>
                          {x.approved
                            ? t("Approved area")
                            : t("Personal calculations")}
                        </small>
                        <button
                          className="text-button"
                          onClick={() => setSelected(x.id)}
                        >
                          {t("Open cultivation")}<ArrowUpRight size={15} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {!cultivations.length && (
                <Empty
                  title={owner ? t("Start a season") : t("No cultivations assigned")}
                  description={owner
                    ? t("Create a farm, add a field, then set up a cultivation with its crop, area and budget.")
                    : t("Ask your organization owner to assign you to a cultivation. You cannot create or assign cultivations yourself.")}
                  action={owner ? () => open("cultivation") : undefined}
                  label={t("Create cultivation")}
                />
              )}
              <section className="panel">
                <PanelHead
                  title={t("Farms & fields")}
                  sub={t("Physical locations behind your cultivations")}
                />
                {data.farms.map((f: R) => (
                  <div className="detail-row" key={f.id}>
                    <div>
                      <strong>{f.name}</strong>
                      <small>{f.district}</small>
                    </div>
                    {(admin || f.owner_id === user.id) && (
                      <button
                        className="text-button"
                        onClick={() =>
                          data.lands?.some((l: R) => l.id === f.id)
                            ? go("lands")
                            : open("editFarm", f.id)
                        }
                      >
                        {t("Edit farm")}</button>
                    )}
                  </div>
                ))}
                <Table headers={["Farm", "District", "Field", "Area", ""]}>
                  {data.fields.map((f: R) => (
                    <tr key={f.id}>
                      <td>{f.farm}</td>
                      <td>
                        {
                          data.farms.find((x: R) => x.id === f.farm_id)
                            ?.district
                        }
                      </td>
                      <td>{f.name}</td>
                      <td>{number(f.acres)} {t(" acres")}</td>
                      <td>
                        {(admin || f.owner_id === user.id) && (
                          <button
                            className="text-button"
                            onClick={() => open("editField", f.id)}
                          >
                            {t("Edit field")}</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </Table>
                {data.farms
                  .filter(
                    (f: R) => !data.fields.some((x: R) => x.farm_id === f.id),
                  )
                  .map((f: R) => (
                    <div className="detail-row" key={f.id}>
                      <span>
                        {f.name} · {f.district}
                      </span>
                      <small>{t("No fields added")}</small>
                    </div>
                  ))}
              </section>
            </>
          )}
          {page === "activities" && (
            <section className="panel">
              <PanelHead
                title={t("Activities, materials & labour")}
                sub={t("Quantities describe the work. Record its cost once in Expenses.")}
                action={
                  <button
                    className="button primary"
                    onClick={() => open("activity")}
                  >
                    <Plus size={16} /> {t("Record activity")}</button>
                }
              />
              {ledger("activity", [
                "Activity",
                "Date",
                "Category",
                "Quantity",
                "Notes",
                "",
              ])}
            </section>
          )}
          {page === "lands" && <LandPanel data={data} onRefresh={refresh} />}
          {page === "organization" && (
            <OrganizationPanel data={data} onRefresh={refresh} />
          )}
          {page === "expenses" && (
            <>
              <div className="stats three">
                <Stat
                  label={t("Cash expenses")}
                  value={money(summary.cash)}
                  note={t("Payments for cultivation costs")}
                />
                <Stat
                  label={t("Imputed costs")}
                  value={money(summary.imputed)}
                  note={t("Family labour, owned land or other noncash value")}
                />
                <Stat
                  label={t("Total economic cost")}
                  value={money(summary.cost)}
                  note={t("Each ledger entry counted once")}
                  accent
                />
              </div>
              <section className="panel">
                <PanelHead
                  title={t("Expense ledger")}
                  sub={t("Attach receipts and link costs to work already recorded")}
                  action={
                    <button
                      className="button primary"
                      disabled={user.account_type === "organization_owner"}
                      onClick={() => open("expense")}
                    >
                      <Plus size={16} /> {t("Add expense")}</button>
                  }
                />
                {ledger("expense", [
                  "Expense",
                  "Date",
                  "Category / basis",
                  "Amount",
                  "Receipts",
                  "",
                ])}
              </section>
            </>
          )}
          {page === "funding" && (
            <>
              <div className="stats">
                <Stat
                  label={t("Investment received")}
                  value={money(summary.funding)}
                  note={t("Capital inflow, separate from revenue")}
                />
                <Stat
                  label={t("Cash spent")}
                  value={money(summary.cash)}
                  note={t("Cash costs only")}
                />
                <Stat
                  label={t("Net recorded cash")}
                  value={money(summary.cashPosition)}
                  note={t("Funding + customer payments − cash costs")}
                  accent
                />
                <Stat
                  label={t("Budget remaining")}
                  value={money(budget - summary.cash)}
                  note={`${Math.round(usage)}% ${t("used")}`}
                />
              </div>
              <section className="panel">
                <PanelHead
                  title={t("Budgets by cultivation")}
                  sub={t("An alert starts at 80% of the cash budget")}
                />
                <Table
                  headers={[
                    "Cultivation",
                    "Budget",
                    "Cash cost",
                    "Remaining",
                    "Usage",
                  ]}
                >
                  {cs.map((x) => (
                    <tr key={x.id}>
                      <td>
                        <button
                          className="text-button"
                          onClick={() => {
                            setSelected(x.id);
                            go("cultivations");
                          }}
                        >
                          {x.name}
                        </button>
                      </td>
                      <td>{money(x.budget)}</td>
                      <td>{money(x.summary.cash)}</td>
                      <td>{money(x.budget - x.summary.cash)}</td>
                      <td>
                        <Badge
                          tone={
                            x.budget && x.summary.cash / x.budget >= 0.8
                              ? "amber"
                              : "green"
                          }
                        >
                          {x.budget
                            ? Math.round((x.summary.cash / x.budget) * 100) +
                              "%"
                            : t("No budget")}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </Table>
              </section>
              <section className="panel">
                <PanelHead
                  title={t("Investment register")}
                  sub={t("Record funds received from owners and investors")}
                  action={
                    owner && (
                      <button
                        className="button primary"
                        onClick={() => open("investment")}
                      >
                        <Plus size={16} /> {t("Record funding")}</button>
                    )
                  }
                />
                {ledger("investment", [
                  "Investment",
                  "Date",
                  "Investor",
                  "Amount",
                  "",
                ])}
              </section>
            </>
          )}
          {page === "harvests" && (
            <>
              <div className="stats">
                <Stat
                  label={t("Saleable harvest")}
                  value={number(summary.saleable) + " " + t("kg")}
                  note={`${number(summary.loss)} ${t("kg recorded losses")}`}
                />
                <Stat
                  label={t("Available stock")}
                  value={number(summary.stock) + " " + t("kg")}
                  note={`${number(summary.sold)} ${t("kg sold")}`}
                />
                <Stat
                  label={t("Sales revenue")}
                  value={money(summary.revenue)}
                  note={t("Quantity × agreed price")}
                  accent
                />
                <Stat
                  label={t("Outstanding payments")}
                  value={money(summary.receivable)}
                  note={`${money(summary.payments)} ${t("received")}`}
                />
              </div>
              <section className="panel">
                <div className="tabs">
                  {[
                    ["harvest", "Harvests"],
                    ["sale", "Sales"],
                    ["payment", "Payments"],
                  ].map(([id, label]) => (
                    <button
                      className={harvestTab === id ? "active" : ""}
                      onClick={() => {
                        setHarvestTab(id);
                        setQuery("");
                      }}
                      key={id}
                    >
                      {t(label as string)}
                    </button>
                  ))}
                  <button
                    className="button primary"
                    onClick={() => open(harvestTab)}
                  >
                    <Plus size={16} /> {t(" Add ")}{t(harvestTab)}
                  </button>
                </div>
                {harvestTab === "harvest"
                  ? ledger("harvest", [
                      "Harvest",
                      "Date",
                      "Grade",
                      "Total",
                      "Saleable / loss",
                      "",
                    ])
                  : harvestTab === "sale"
                    ? ledger("sale", [
                        "Buyer",
                        "Date",
                        "Quantity / price",
                        "Sale value",
                        "Balance",
                        "",
                      ])
                    : ledger("payment", [
                        "Method",
                        "Date",
                        "Reference",
                        "Received",
                        "Buyer",
                        "",
                      ])}
              </section>
            </>
          )}
          {page === "market" && (
            <>
              <div className="notice amber-note">
                <AlertCircle size={20} />
                <div>
                  <strong>{t("Historical records, not live market prices")}</strong>
                  <p>
                    {t("1,950 observations from two candidate workbooks. All imported prices are unverified. Units are LKR/kg per workbook notes; original-source confirmation is pending. No grapes data is available.")}</p>
                </div>
              </div>
              <section className="panel">
                {priceCultivation ? <p className="helper">{t("Selected cultivation crop")}: {t(priceCultivation.crop)} · {t("Original variants are kept separate. You can explore other products below.")}</p>
                  : <p className="helper">{t("Choose a cultivation to show prices for its crop, or explore a product below.")}</p>}
                <div className="market-filters">
                  <label className="field">
                    <span>{t("Product / original variant")}</span>
                    <select
                      value={marketCrop}
                      onChange={(e) => {
                        setMarketSelection({scope: marketScope, product: e.target.value});
                        setMarketPage(0);
                      }}
                    >
                      {products.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>{t("Claimed market")}</span>
                    <select
                      value={market}
                      onChange={(e) => {
                        setMarket(e.target.value);
                        setMarketPage(0);
                      }}
                    >
                      <option value="all">{t("All markets")}</option>
                      <option value={"Dambulla"}>{t("Dambulla")}</option>
                      <option value={"Thabuththegama"}>{t("Thabuththegama")}</option>
                    </select>
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={showFlagged}
                      onChange={(e) => {
                        setShowFlagged(e.target.checked);
                        setMarketPage(0);
                      }}
                    />{" "}
                    {t("Show flagged original records")}</label>
                </div>
                <PanelHead
                  title={t(marketCrop) + " · " + (market === "all" ? t("All markets") : market)}
                  sub={t("Historical range midpoint · unverified · LKR/kg")}
                />
                {priceHistory.reason && <p className="notice" role="status">{t(priceHistory.reason)}</p>}
                <PriceChart rows={chartRows} />
                <div className="footnote">
                  {t("Chart uses complete, ordered bounds with no market-identity flag. Midpoints are arithmetic range midpoints, not transactions. Time spacing reflects actual dates.")}</div>
              </section>
              <div className="notice">
                <History size={20} />
                <p>
                  {t("Dambulla-labelled data from 24 September 2026 uses Keppetipola forms: market identity uncertain. Eight reversed ranges are preserved for review. Partial ranges have no midpoint. No source values have been corrected.")}</p>
              </div>
              <section className="panel">
                <PanelHead
                  title={t("Original observations")}
                  sub={`${visiblePrices.length} / ${marketRows.length} · ${t("records for this selection")}`}
                />
                <Table
                  headers={[
                    "Date",
                    "Original product label",
                    "Market identity",
                    "Lower / upper",
                    "Midpoint",
                    "Source / status",
                  ]}
                >
                  {visiblePrices
                    .slice(marketPage * 25, marketPage * 25 + 25)
                    .map((p) => (
                      <tr key={p.id}>
                        <td>{p.date}</td>
                        <td className="wrap-cell">
                          {p.originalLabel}
                          <small>{t(p.category)}</small>
                        </td>
                        <td className="wrap-cell">
                          {p.market}
                          <small>
                            {p.marketIdentity === "uncertain"
                              ? t("Excluded from chart")
                              : t("Claimed, unverified")}
                          </small>
                        </td>
                        <td>
                          {p.lower ?? t("Missing")} / {p.upper ?? t("Missing")}
                        </td>
                        <td>
                          {priceEligible(p)
                            ? number((p.lower + p.upper) / 2)
                            : t("Not calculated")}
                        </td>
                        <td className="wrap-cell">
                          <Badge
                            tone={
                              p.state === "reversed" ||
                              p.marketIdentity === "uncertain"
                                ? "amber"
                                : "neutral"
                            }
                          >
                            {t(p.state)}
                          </Badge>
                          <small title={p.sourceHash}>
                            {p.source}
                            <br />
                            {p.sheet}!{p.cells}
                          </small>
                        </td>
                      </tr>
                    ))}
                </Table>
                {!marketRows.length && <p className="helper">{t("No original observations are available for this selection.")}</p>}
                <div className="pagination">
                  <button
                    className="button"
                    disabled={!marketPage}
                    onClick={() => setMarketPage((p) => p - 1)}
                  >
                    {t("Previous")}</button>
                  <span>
                    {t("Page")} {marketPage + 1} {t(" of")}{" "}
                    {Math.max(1, Math.ceil(visiblePrices.length / 25))}
                  </span>
                  <button
                    className="button"
                    disabled={(marketPage + 1) * 25 >= visiblePrices.length}
                    onClick={() => setMarketPage((p) => p + 1)}
                  >
                    {t("Next")}</button>
                </div>
              </section>
            </>
          )}
          {page === "decisions" && (
            <>
              <div className="dashboard-grid">
                <section className="panel">
                  <PanelHead
                    title={t("Revenue scenario")}
                    sub={t("Your assumptions, separated from actual results")}
                  />
                  <div className="form-grid">
                    <label className="field">
                      <span>{t("Assumed saleable yield (kg)")}</span>
                      <input
                        type="number"
                        min="0"
                        value={scenarioYield || String(c?.forecast_kg || "")}
                        onChange={(e) => setScenarioYield(e.target.value)}
                        placeholder={t("Enter your forecast")}
                      />
                    </label>
                    <label className="field">
                      <span>{t("Assumed selling price (LKR/kg)")}</span>
                      <input
                        type="number"
                        min="0"
                        value={scenarioPrice}
                        onChange={(e) => setScenarioPrice(e.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>{t("Additional forecast cost (LKR)")}</span>
                      <input
                        type="number"
                        min="0"
                        value={remaining}
                        onChange={(e) => setRemaining(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="scenario-result">
                    <small>{t("PROJECTED ECONOMIC PROFIT / LOSS")}</small>
                    <strong>
                      {targetYield > 0
                        ? money(proj.profit)
                        : t("Enter a forecast yield")}
                    </strong>
                    <span>
                      {t("Scenario revenue")} {money(proj.revenue)} {t(" · actual costs")}{" "}
                      {money(summary.cost)}
                    </span>
                  </div>
                  <p className="helper">
                    {t("Formula: yield × assumed price − recorded economic cost − additional forecast cost. This is a whole-season scenario, not additional revenue on top of actual sales. Price defaults to an editable example assumption of LKR 60, not a market estimate.")}</p>
                </section>
                <section className="panel">
                  <PanelHead
                    title={t("Break-even & budget")}
                    sub={t("Simple calculations, visible assumptions")}
                  />
                  <div className="detail-row">
                    <span>{t("Scenario break-even price")}</span>
                    <strong>{money(proj.breakEven)} {t(" / kg")}</strong>
                  </div>
                  {summary.saleable > 0 && <div className="detail-row">
                    <span>{t(unitCostLabel)}</span>
                    <strong>{money(summary.costPerKg)}</strong>
                  </div>}
                  <div className="detail-row">
                    <span>{t("Cash budget used")}</span>
                    <strong>
                      {budget ? number(usage) + "%" : t("No budget set")}
                    </strong>
                  </div>
                  <div className="notice amber-note">
                    <Lightbulb size={19} />
                    <p>
                      {usage >= 100
                        ? t("Recorded cash costs exceed the budget. Review outstanding work and revise the plan.")
                        : usage >= 80
                          ? t("At least 80% of the cash budget is used. Check remaining work and funding.")
                          : t("Record all costs and review remaining work before making new commitments.")}
                    </p>
                  </div>
                  <p className="helper">
                    {t("Break-even = (actual economic cost + additional forecast cost) / assumed yield. No reliable seasonal predictions or best-day-to-sell promises are supported by the sparse, irregular historical records.")}</p>
                </section>
              </div>
              <section className="panel">
                <PanelHead
                  title={t("Validated farm-sale prices")}
                  sub={t("Median transaction unit price · last 30 days · approved areas and validated closed cultivations")}
                />
                {data.saleBenchmarks
                  ?.filter((b: R) => !c || b.crop_id === c.crop_id)
                  .map((b: R) => (
                    <div
                      className="detail-row"
                      key={b.crop_id + b.district + b.grade}
                    >
                      <div>
                        <strong>
                          {
                            data.crops.find((cr: R) => cr.id === b.crop_id)
                              ?.name
                          }{" "}
                          · {b.district} {t(" · Grade ")}{b.grade}
                        </strong>
                        <small>
                          {b.count} {t(" sales · ")}{b.owners} {t("independent owners · LKR/kg")}</small>
                      </div>
                      <strong>{money(b.median)}</strong>
                    </div>
                  ))}
                {!data.saleBenchmarks?.length && (
                  <Empty
                    title={t("Insufficient validated farm-sale data")}
                    description={t("At least three eligible sale records from three independent owners in the same crop, district and grade within 30 days are required.")}
                  />
                )}
                <p className="helper">
                  {t("Unweighted median of agreed prices per kg; independent owner threshold prevents one farm from supplying the entire benchmark. This is separate from historical market-list ranges and is not a live price feed.")}</p>
              </section>
              <section className="panel">
                <PanelHead
                  title={t("Regional cost benchmarks")}
                  sub={t("Median economic cost per saleable kg · closed, validated, approved-area records only")}
                />
                {data.benchmarks
                  .filter((b: R) => !c || b.crop_id === c.crop_id)
                  .map((b: R) => (
                    <div className="detail-row" key={b.crop + b.district}>
                      <div>
                        <strong>
                          {t(b.crop)} · {b.district}
                        </strong>
                        <small>
                          {b.count} {t(" eligible cultivations · ")}{b.owners}{" "}
                          {t("independent owners")}</small>
                      </div>
                      <strong>{money(b.value)}</strong>
                    </div>
                  ))}
                {!data.benchmarks.length && (
                  <Empty
                    title={t("Insufficient benchmark data")}
                    description={t("At least three eligible closed cultivations from three independent owners in the same crop and district are required. No reference areas are approved by default.")}
                  />
                )}
                <p className="helper">
                  {t("Your personal calculations work in all districts. Outside-area or unvalidated records do not influence this benchmark. Imported historical price-list ranges are never treated as farm-sale evidence.")}</p>
              </section>
            </>
          )}
          {page === "reports" && (
            <>
              <div className="section-actions">
                <p>{t("Export only records you are permitted to access.")}</p>
                <div>
                  <a
                    className="button"
                    href={
                      "/api/export?kind=summary&cultivation=" +
                      (selected === "all" ? "" : selected)
                    }
                  >
                    <Download size={16} /> {t("Summary CSV")}</a>
                  <a
                    className="button primary"
                    href={
                      "/api/export?kind=ledger&cultivation=" +
                      (selected === "all" ? "" : selected)
                    }
                  >
                    <Download size={16} /> {t("Ledger CSV")}</a>
                  <button className="button" onClick={() => window.print()}>
                    {t("Print report")}</button>
                </div>
              </div>
              <section className="panel">
                <PanelHead
                  title={t("Cultivation financial statement")}
                  sub={t("LKR · actual records in the selected scope")}
                />
                {[
                  ["Investment funding (capital)", summary.funding],
                  ["Cash cultivation costs", summary.cash],
                  ["Imputed cultivation costs", summary.imputed],
                  ["Total economic cost", summary.cost],
                  ["Sales revenue (agreed value)", summary.revenue],
                  ["Economic profit / loss", summary.profit],
                  ["Customer payments received", summary.payments],
                  ["Receivables", summary.receivable],
                  [
                    "Net recorded cash (funding + payments − cash costs)",
                    summary.cashPosition,
                  ],
                ].map(([label, value]) => (
                  <div className="statement-row" key={label as string}>
                    <span>{t(label as string)}</span>
                    <strong>{money(value as number)}</strong>
                  </div>
                ))}
                <p className="helper">
                  {t("Unsold harvest is not recognized as sales revenue. This is a cultivation monitoring statement; no tax or full business balance-sheet treatment is applied. CSV amounts use LKR; quantity columns use kg and areas use acres.")}</p>
              </section>
              <section className="panel">
                <PanelHead
                  title={t("Correction history")}
                  sub={t("Voided records remain visible and excluded from actual totals")}
                />
                <Table
                  headers={["Date", "Type", "Cultivation", "Original payload"]}
                >
                  {entries
                    .filter((e) => e.voided)
                    .map((e) => (
                      <tr key={e.id}>
                        <td>{e.date}</td>
                        <td>{t(e.kind)}</td>
                        <td>
                          {
                            cultivations.find((c) => c.id === e.cultivation_id)
                              ?.name
                          }
                        </td>
                        <td className="wrap-cell">
                          {JSON.stringify(e.payload)}
                        </td>
                      </tr>
                    ))}
                </Table>
              </section>
            </>
          )}
          {page === "settings" && (
            <>
              <ProfilePanel user={user} onRefresh={refresh} />
              <section className="panel">
                <PanelHead
                  title={t("Account security")}
                  sub={t("Change your password and revoke previous sessions")}
                  action={
                    <button className="button" onClick={() => open("password")}>
                      {t("Change my password")}</button>
                  }
                />
                <p className="helper">
                  {t("Signed in as")} {user.email || user.mobile}{t(". Passwords stay in this local installation.")}</p>
              </section>
              {admin ? (
                <>
                  <section className="panel">
                    <PanelHead
                      title={t("People & access")}
                      sub={t("Create local accounts. Assign supervisors inside each cultivation.")}
                      action={
                        <button
                          className="button primary"
                          onClick={() => open("user")}
                        >
                          <Plus size={16} /> {t("Add person")}</button>
                      }
                    />
                    <Table headers={["Name", "Email / mobile", "Role", "Access", ""]}>
                      {data.users.map((u: R) => (
                        <tr key={u.id}>
                          <td>
                            <strong>{u.name}</strong>
                          </td>
                          <td>{u.email || u.mobile || t("Not provided")}</td>
                          <td>{t(accountLabel(u))}</td>
                          <td>
                            <Badge tone={u.active ? "green" : "amber"}>
                              {u.active ? t("Active") : t("Inactive")}
                            </Badge>
                          </td>
                          <td>
                            {u.id !== user.id && (
                              <button
                                className="text-button"
                                onClick={() => open("resetPassword", u.id)}
                              >
                                {t("Reset password")}</button>
                            )}{" "}
                            {u.id !== user.id && (
                              <button
                                className="text-button"
                                onClick={() =>
                                  write({
                                    action: "userActive",
                                    id: u.id,
                                    active: !u.active,
                                  })
                                }
                              >
                                {u.active ? t("Deactivate") : t("Reactivate")}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </Table>
                  </section>
                  <div className="dashboard-grid">
                    <section className="panel">
                      <PanelHead
                        title={t("Crop catalogue")}
                        sub={t("Shared calculation method, crop-specific varieties")}
                        action={
                          <button
                            className="button"
                            onClick={() => open("crop")}
                          >
                            {t("Add crop")}</button>
                        }
                      />
                      {data.crops.map((x: R) => (
                        <div className="detail-row" key={x.id}>
                          <strong>{x.name}</strong>
                          <small>
                            {JSON.parse(x.varieties).join(", ") ||
                              t("Variety entered per cultivation")}
                          </small>
                          <button
                            className="text-button"
                            onClick={() => open("editCrop", x.id)}
                          >
                            {t("Edit")}</button>
                        </div>
                      ))}
                    </section>
                    <section className="panel">
                      <PanelHead
                        title={t("Reference-area policy")}
                        sub={t("Explicit administrator policy; examples are not pre-approved")}
                        action={
                          <button
                            className="button"
                            onClick={() => open("area")}
                          >
                            {t("Set area policy")}</button>
                        }
                      />
                      {data.areas.map((a: R) => (
                        <div className="detail-row" key={a.id}>
                          <span>
                            {
                              data.crops.find((x: R) => x.id === a.crop_id)
                                ?.name
                            }{" "}
                            · {a.district}
                          </span>
                          <Badge tone={a.approved ? "green" : "amber"}>
                            {a.approved ? t("Approved") : t("Not approved")}
                          </Badge>
                        </div>
                      ))}
                      {!data.areas.length && (
                        <Empty
                          title={t("No approved reference areas")}
                          description={t("All farmers can still use personal calculations. Set policy only after confirming suitable crop and district combinations.")}
                        />
                      )}
                    </section>
                  </div>
                </>
              ) : (
                <section className="panel">
                  <PanelHead
                    title={t("Your account")}
                    sub={t("Your permissions are checked on the server")}
                  />
                  <p>
                    {user.name} · {user.email} · {t(accountLabel(user))}
                  </p>
                  <p className="helper">
                    {t("An administrator manages accounts and area policy. Cultivation owners manage supervisor assignments.")}</p>
                </section>
              )}
              <section className="panel">
                <PanelHead
                  title={t("Audit history")}
                  sub={t("Immutable application events · latest 300 accessible events")}
                  action={
                    <a className="button" href="/api/export?kind=audit">
                      <Download size={16} />
                      {t("Export audit")}</a>
                  }
                />
                <Table headers={["When", "Person", "Event", "Details"]}>
                  {data.audit.map((a: R) => (
                    <tr key={a.id}>
                      <td>
                        {new Date(a.created_at).toLocaleString("en-GB", {
                          timeZone: "Asia/Colombo",
                        })}
                      </td>
                      <td>{a.actor}</td>
                      <td>{t(a.event)}</td>
                      <td className="wrap-cell">
                        <details>
                          <summary>{t("View event")}</summary>
                          <pre>
                            {JSON.stringify(
                              {
                                before: a.before_json
                                  ? JSON.parse(a.before_json)
                                  : null,
                                after: a.after_json
                                  ? JSON.parse(a.after_json)
                                  : null,
                              },
                              null,
                              2,
                            )}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  ))}
                </Table>
              </section>
              <div className="notice">
                <Settings size={20} />
                <p>
                  {t("Local SQLite, local password accounts and private filesystem receipts. PostgreSQL/Supabase authentication, database, storage and hosted access are not connected. Back up the storage directory with the application stopped.")}</p>
              </div>
            </>
          )}
          <footer>
            {t("Farmwise")}<span>{t("Made for decisions grounded in your records.")}</span>
            <span>{t("LKR · kg · acres · Asia/Colombo")}</span>
          </footer>
        </div>
      </main>
      {notice && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          {t(notice)}
        </div>
      )}
      <dialog
        ref={modalRef}
        onCancel={() => setModal(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setModal(null);
        }}
        aria-labelledby="dialog-title"
      >
        <div className="dialog-inner">
          <div className="dialog-head">
            <div>
              <span className="eyebrow">{t("FARM WORKSPACE")}</span>
              <h2 id="dialog-title">
                {t(
                  (
                    {
                      password: "Change your password",
                      resetPassword: "Reset account password",
                      editFarm: "Edit farm",
                      editField: "Edit field",
                      editCrop: "Edit crop & varieties",
                      editCultivation: "Edit cultivation details",
                      choose: "What would you like to record?",
                      farm: "Add a farm",
                      field: "Add a field",
                      cultivation: "Start a cultivation",
                      activity: "Record an activity",
                      expense: "Add an expense",
                      investment: "Record investment funding",
                      harvest: "Record a harvest",
                      sale: "Record a sale",
                      payment: "Record a payment",
                      user: "Add a person",
                      crop: "Add a crop",
                      area: "Set reference-area policy",
                      assign: "Assign a supervisor",
                      budget: "Edit cultivation plan",
                      void: "Correct a record",
                      receipt: "Attach a receipt",
                    } as R
                  )[modal || ""] || ""
                )}
              </h2>
            </div>
            <button
              className="icon-button"
              aria-label={t("Close dialog")}
              onClick={() => setModal(null)}
            >
              <X size={21} />
            </button>
          </div>
          {modal === "choose" ? (
            <div className="record-choices">
              {[
                [
                  "activity",
                  "Activity or labour",
                  "Describe the work and quantities",
                  ClipboardList,
                ],
                [
                  "expense",
                  "Expense or imputed cost",
                  "Record cost once, attach a receipt",
                  Receipt,
                ],
                [
                  "harvest",
                  "Harvest",
                  "Saleable quantity, grade and losses",
                  Leaf,
                ],
                ["sale", "Sale", "Agreed price, buyer and quantity", Coins],
                [
                  "payment",
                  "Customer payment",
                  "Track part or full payments",
                  Wallet,
                ],
                ...(owner
                  ? [
                      [
                        "investment",
                        "Investment funding",
                        "Capital received, separate from sales",
                        Package,
                      ],
                      [
                        "cultivation",
                        "New cultivation",
                        "Plan a crop and field for the season",
                        Sprout,
                      ],
                    ]
                  : []),
              ]
                .filter(
                  ([id]) =>
                    id !== "expense" ||
                    user.account_type !== "organization_owner",
                )
                .map(([id, label, sub, Icon]: any) => (
                  <button key={id} onClick={() => open(id)}>
                    <Icon size={22} />
                    <div>
                      <strong>{t(label as string)}</strong>
                      <small>{t(sub)}</small>
                    </div>
                    <ChevronRight size={17} />
                  </button>
                ))}
            </div>
          ) : (
            <form onSubmit={saveForm} key={modal}>
              <div className="form-grid">
                {modal === "password" && (
                  <Field
                    label={t("Current password")}
                    name="currentPassword"
                    type="password"
                    required
                    autoComplete="current-password"
                  />
                )}
                {["password", "resetPassword"].includes(modal || "") && (
                  <>
                    {modal === "resetPassword" && resetUser && (
                      <p className="helper full">{t("Resetting password for ")}<strong>{resetUser.name}</strong> ({resetUser.email || resetUser.mobile || t("no contact provided")}).</p>
                    )}
                    <Field
                      label={t("New password (12+ characters)")}
                      name="password"
                      type="password"
                      minLength={12}
                      maxLength={256}
                      required
                      autoComplete="new-password"
                    />
                    <p className="helper full">
                      {t("Previous sessions for this account will be revoked. Share reset credentials securely yourself.")}</p>
                  </>
                )}
                {modal === "editFarm" && (
                  <>
                    <Field
                      label={t("Farm name")}
                      name="name"
                      required
                      defaultValue={editFarm?.name}
                    />
                    <Field
                      label={t("District")}
                      name="district"
                      required
                      defaultValue={editFarm?.district}
                    />
                    <p className="helper full">
                      {t("Changing the district resets cultivation validation and reevaluates area eligibility.")}</p>
                  </>
                )}
                {modal === "editField" && (
                  <>
                    <Field
                      label={t("Field name")}
                      name="name"
                      required
                      defaultValue={editField?.name}
                    />
                    <Field
                      label={t("Field area (acres)")}
                      name="acres"
                      type="number"
                      min="0.001"
                      step="0.001"
                      required
                      defaultValue={editField?.acres}
                    />
                  </>
                )}
                {modal === "editCrop" && (
                  <>
                    <Field
                      label={t("Crop name")}
                      name="name"
                      required
                      defaultValue={editCrop?.name}
                    />
                    <Field
                      label={t("Suggested varieties (comma-separated)")}
                      name="varieties"
                      defaultValue={
                        editCrop
                          ? JSON.parse(editCrop.varieties).join(", ")
                          : ""
                      }
                    />
                  </>
                )}
                {modal === "editCultivation" && c && (
                  <>
                    <Field
                      label={t("Cultivation name")}
                      name="name"
                      required
                      defaultValue={c.name}
                    />
                    <Field
                      label={t("Variety")}
                      name="variety"
                      required
                      defaultValue={c.variety}
                    />
                    <Field
                      label={t("Planting / season start date")}
                      name="planted"
                      type="date"
                      defaultValue={c.planted}
                      required
                    />
                    <Field
                      label={t("Expected harvest date")}
                      name="harvest_date"
                      type="date"
                      defaultValue={c.harvest_date}
                      required
                    />
                    <Field
                      label={t("Cultivated area (acres)")}
                      name="acres"
                      type="number"
                      min="0.001"
                      step="0.001"
                      required
                      defaultValue={c.acres}
                    />
                    <p className="helper full">
                      {t("Crop and field links stay fixed to preserve historical records. Corrections reset record validation.")}</p>
                  </>
                )}
                {[
                  "activity",
                  "expense",
                  "investment",
                  "harvest",
                  "sale",
                  "payment",
                ].includes(modal || "") && (
                  <>
                    <label className="field full">
                      <span>{t("Cultivation")}</span>
                      <select
                        name="cultivation_id"
                        required
                        defaultValue={c?.status !== "closed" ? c?.id || "" : ""}
                        onChange={(e) => { setSelected(e.target.value); setError(""); }}
                      >
                        <option value="" disabled>
                          {t("Choose an active cultivation")}</option>
                        {cultivations
                          .filter(
                            (x) =>
                              x.status !== "closed" &&
                              (modal !== "investment" ||
                                admin ||
                                x.owner_id === user.id),
                          )
                          .map((x) => (
                            <option value={x.id} key={x.id}>
                              {x.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    {!cultivations.some((x) => x.status !== "closed" &&
                      (modal !== "investment" || admin || x.owner_id === user.id)) && (
                      <p className="helper full" role="status">
                        {owner
                          ? t("No open cultivation is available. Create a cultivation or reopen an existing season before adding records.")
                          : t("No open assigned cultivation is available. Ask your organization owner to assign you to an open season.")}
                      </p>
                    )}
                    <Field
                      label={t("Record date")}
                      name="date"
                      type="date"
                      defaultValue={today()}
                      max={today()}
                      required
                    />
                  </>
                )}
                {modal === "farm" && (
                  <>
                    <Field label={t("Farm name")} name="name" required />
                    <Field
                      label={t("District")}
                      name="district"
                      required
                      placeholder={t("e.g. Anuradhapura")}
                    />
                    {admin &&
                      inputSelect(
                        "Owner",
                        "owner_id",
                        data.users.filter(
                          (u: R) => u.active && u.role !== "supervisor",
                        ),
                      )}
                  </>
                )}
                {modal === "field" && (
                  <>
                    {inputSelect(
                      "Farm",
                      "farm_id",
                      data.farms.filter(
                        (f: R) => admin || f.owner_id === user.id,
                      ),
                    )}
                    <Field label={t("Field name")} name="name" required />
                    <Field
                      label={t("Field area (acres)")}
                      name="acres"
                      type="number"
                      min="0.001"
                      step="0.001"
                      required
                    />
                  </>
                )}
                {modal === "cultivation" && (
                  <>
                    <Field
                      label={t("Cultivation name")}
                      name="name"
                      required
                      placeholder={t("Watermelon · North Field")}
                    />
                    {inputSelect(
                      "Field",
                      "field_id",
                      data.fields
                        .filter((f: R) => admin || f.owner_id === user.id)
                        .map((f: R) => ({
                          ...f,
                          label:
                            f.farm +
                            " / " +
                            f.name +
                            " (" +
                            number(f.acres) +
                            " " + t("acres") + ")",
                        })),
                      "label",
                    )}
                    {inputSelect("Crop", "crop_id", data.crops)}
                    <Field
                      label={t("Variety")}
                      name="variety"
                      required
                      placeholder={t("Enter actual variety")}
                      list="variety-options"
                    />
                    <datalist id="variety-options">
                      {[
                        ...new Set(
                          data.crops.flatMap((cr: R) =>
                            JSON.parse(cr.varieties),
                          ),
                        ),
                      ].map((v: any) => (
                        <option key={v} value={v} />
                      ))}
                    </datalist>
                    <Field
                      label={t("Planting / season start date")}
                      name="planted"
                      type="date"
                      defaultValue={today()}
                      required
                    />
                    <Field
                      label={t("Expected harvest date")}
                      name="harvest_date"
                      type="date"
                      required
                    />
                    <Field
                      label={t("Cultivated area (acres)")}
                      name="acres"
                      type="number"
                      min="0.001"
                      step="0.001"
                      required
                    />
                    <Field
                      label={t("Cash budget (LKR)")}
                      name="budget"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                    />
                    <Field
                      label={t("Forecast saleable yield (kg)")}
                      name="forecast_kg"
                      type="number"
                      min="0"
                      step="0.001"
                      required
                      defaultValue="0"
                    />
                  </>
                )}
                {["activity", "expense", "investment", "harvest"].includes(
                  modal || "",
                ) && <Field label={t("Description")} name="description" required />}
                {["activity", "expense"].includes(modal || "") && (
                  <label className="field">
                    <span>{t("Category")}</span>
                    <select aria-label={t("Category")} name="category">
                      {categories.map((x) => (
                        <option key={x} value={x}>{t(x)}</option>
                      ))}
                    </select>
                  </label>
                )}
                {modal === "activity" && (
                  <>
                    <Field
                      label={t("Quantity (workers, days, kg, hours…)")}
                      name="quantity"
                      type="number"
                      min="0"
                      step="0.001"
                      required
                    />
                    <Field
                      label={t("Unit")}
                      name="unit"
                      required
                      placeholder={t("worker-days, kg, hours…")}
                    />
                    <label className="field full">
                      <span>{t("Notes")}</span>
                      <textarea
                        name="notes"
                        maxLength={1000}
                        placeholder={t("Material, labour team or work details")}
                      />
                    </label>
                    <p className="helper full">
                      {t("This records work, not cost. Add one linked expense for paid labour or an imputed expense for family labour.")}</p>
                  </>
                )}
                {["expense", "investment", "payment"].includes(modal || "") && (
                  <Field
                    label={t("Amount (LKR)")}
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                  />
                )}
                {modal === "expense" && (
                  <>
                    {(user.organization_id ||
                      (admin &&
                        data.members?.some(
                          (m: R) =>
                            m.account_type === "organization_farmer" &&
                            m.organization_id ===
                              data.users.find((u: R) => u.id === c?.owner_id)
                                ?.organization_id,
                        ))) && (
                      <label className="field full">
                        <span>{t("Expense belongs to farmer")}</span>
                        <select
                          aria-label={t("Expense belongs to farmer")}
                          name="farmer_id"
                          required
                          defaultValue=""
                        >
                          <option value="" disabled>
                            {t("Choose assigned farmer ID")}</option>
                          {data.farmerAssignments
                            ?.filter((a: R) => a.cultivation_id === c?.id)
                            .map((a: R) => (
                              <option key={a.farmer_id} value={a.farmer_id}>
                                {a.public_id} · {a.name}
                              </option>
                            ))}
                        </select>
                      </label>
                    )}
                    <label className="field">
                      <span>{t("Cost basis")}</span>
                      <select aria-label={t("Cost basis")} name="basis">
                        <option value="cash">{t("Cash cost")}</option>
                        <option value="imputed">{t("Imputed / noncash cost")}</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>{t("Related activity (optional)")}</span>
                      <select name="activity_id" defaultValue="">
                        <option value="">{t("No linked activity")}</option>
                        {selectedEntries("activity").map((e) => (
                          <option value={e.id} key={e.id}>
                            {e.date} · {e.payload.description}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="helper full">
                      {t("Amounts are total cost for this entry. Do not enter the same purchase or labour cost twice. Attach the receipt after saving.")}</p>
                  </>
                )}
                {modal === "investment" && (
                  <>
                    <Field label={t("Investor / funder")} name="investor" required />
                    <p className="helper full">
                      {t("Record funds actually received. Investment increases recorded cash, not sales revenue or profit.")}</p>
                  </>
                )}
                {modal === "harvest" && (
                  <>
                    <Field
                      label={t("Grade")}
                      name="grade"
                      required
                      placeholder={t("e.g. A / marketable")}
                    />
                    <Field
                      label={t("Total harvested (kg)")}
                      name="total"
                      type="number"
                      min="0.001"
                      step="0.001"
                      required
                    />
                    <Field
                      label={t("Saleable quantity (kg)")}
                      name="saleable"
                      type="number"
                      min="0"
                      step="0.001"
                      required
                    />
                    <Field
                      label={t("Damaged / lost (kg)")}
                      name="loss"
                      type="number"
                      min="0"
                      step="0.001"
                      required
                      defaultValue="0"
                    />
                    <p className="helper full">
                      {t("Total must equal saleable plus losses. Use separate entries for different grades.")}</p>
                  </>
                )}
                {modal === "sale" && (
                  <>
                    {inputSelect(
                      "Harvest / grade",
                      "harvest_id",
                      selectedEntries("harvest").map((h) => ({
                        ...h,
                        label:
                          h.date +
                          " · " +
                          h.payload.grade +
                          " · " +
                          number(
                            h.payload.saleable -
                              selectedEntries("sale")
                                .filter((s) => s.payload.harvest_id === h.id)
                                .reduce((a, s) => a + s.payload.kg, 0),
                          ) +
                          " " + t("kg available"),
                      })),
                      "label",
                    )}
                    <Field
                      label={t("Buyer / destination market")}
                      name="buyer"
                      required
                    />
                    <Field
                      label={t("Quantity sold (kg)")}
                      name="kg"
                      type="number"
                      min="0.001"
                      step="0.001"
                      required
                    />
                    <Field
                      label={t("Agreed selling price (LKR/kg)")}
                      name="price"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                    />
                    <p className="helper full">
                      {t("Choose a cultivation first to load its harvests. Record payment separately, even for an immediate cash sale.")}</p>
                  </>
                )}
                {modal === "payment" && (
                  <>
                    {inputSelect(
                      "Sale",
                      "sale_id",
                      selectedEntries("sale").map((s) => ({
                        ...s,
                        label:
                          s.date +
                          " · " +
                          s.payload.buyer +
                          " · " +
                          money(
                            Math.round(s.payload.kg * s.payload.price) -
                              selectedEntries("payment")
                                .filter((p) => p.payload.sale_id === s.id)
                                .reduce((a, p) => a + p.payload.amount, 0),
                          ) +
                          " " + t("due"),
                      })),
                      "label",
                    )}
                    <label className="field">
                      <span>{t("Payment method")}</span>
                      <select name="method">
                        {["Cash", "Bank transfer", "Cheque", "Other"].map(
                          (m) => (
                            <option key={m} value={m}>{t(m)}</option>
                          ),
                        )}
                      </select>
                    </label>
                    <Field label={t("Reference (optional)")} name="reference" />
                  </>
                )}
                {modal === "user" && (
                  <>
                    <Field label={t("Name")} name="name" required />
                    <Field
                      label={t("Email address")}
                      name="email"
                      type="email"
                      required
                    />
                    <label className="field">
                      <span>{t("Role")}</span>
                      <select name="role">
                        {["farmer", "admin"].map((r) => (
                          <option key={r} value={r}>{accountLabel({role:r})}</option>
                        ))}
                      </select>
                    </label>
                    <Field
                      label={t("Initial password (12+ characters)")}
                      name="password"
                      type="password"
                      minLength={12}
                      maxLength={256}
                      autoComplete="new-password"
                      required
                    />
                    <p className="helper full">
                      {t("Share initial credentials securely yourself. No invitation email service is connected.")}</p>
                  </>
                )}
                {modal === "crop" && (
                  <>
                    <Field label={t("Crop name")} name="name" required />
                    <Field
                      label={t("Suggested varieties (comma-separated)")}
                      name="varieties"
                    />
                  </>
                )}
                {modal === "area" && (
                  <>
                    {inputSelect("Crop", "crop_id", data.crops)}
                    <Field
                      label={t("District (match cultivation district)")}
                      name="district"
                      required
                    />
                    <label className="field">
                      <span>{t("Policy status")}</span>
                      <select name="approved">
                        <option value="false">{t("Not approved")}</option>
                        <option value="true">{t("Approve for reference data")}</option>
                      </select>
                    </label>
                    <p className="helper full">
                      {t("This creates or updates the crop/district policy. Approval does not validate individual records or guarantee enough data.")}</p>
                  </>
                )}
                {modal === "assign" && (
                  <>
                    {inputSelect(
                      "Supervisor",
                      "user_id",
                      data.users.filter(
                        (u: R) => u.role === "supervisor" && u.active !== 0,
                      ),
                    )}
                    <p className="helper full">
                      {t("Assignment grants operational recording and access to this cultivation only.")}</p>
                  </>
                )}
                {modal === "budget" && c && (
                  <>
                    <Field
                      label={t("Cash budget (LKR)")}
                      name="budget"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={c.budget / 100}
                      required
                    />
                    <Field
                      label={t("Forecast saleable yield (kg)")}
                      name="forecast_kg"
                      type="number"
                      min="0"
                      step="0.001"
                      defaultValue={c.forecast_kg}
                      required
                    />
                    <label className="field">
                      <span>{t("Season status")}</span>
                      <select name="status" defaultValue={t(c.status)}>
                        <option value="planned">{t("planned")}</option>
                        <option value="active">{t("active")}</option>
                        <option value="closed">{t("closed")}</option>
                      </select>
                    </label>
                    <p className="helper full">
                      {t("Closing locks operational entries. Reopening resets validation. Plan changes also reset validation.")}</p>
                  </>
                )}
                {modal === "void" && (
                  <>
                    <p className="helper full">
                      {t("The original record stays in the audit history and is excluded from totals. Void linked records first, then add a corrected replacement.")}</p>
                    <Field
                      label={t("Reason for correction")}
                      name="reason"
                      required
                    />
                  </>
                )}
                {modal === "receipt" && (
                  <>
                    <label className="field full">
                      <span>{t("Receipt file · PDF, JPEG or PNG · up to 5 MB")}</span>
                      <input
                        name="file"
                        type="file"
                        accept="application/pdf,image/jpeg,image/png"
                        required
                      />
                    </label>
                    <p className="helper full">
                      {t("Files are private and downloaded only after checking cultivation access.")}</p>
                  </>
                )}
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
                  onClick={() => setModal(null)}
                >
                  {t("Cancel")}</button>
                <button className="button primary" disabled={busy ||
                  (["activity", "expense", "investment", "harvest", "sale", "payment"].includes(modal || "") &&
                    !cultivations.some((x) => x.status !== "closed" &&
                      (modal !== "investment" || admin || x.owner_id === user.id)))}>
                  {busy
                    ? t("Saving…")
                    : modal === "void"
                      ? t("Void record with reason")
                      : t("Save record")}
                  <CheckCircle2 size={16} />
                </button>
              </div>
            </form>
          )}
        </div>
      </dialog>
    </div>
  );
}
function Brand() {
  const { t } = useLanguage();
  return (
    <div className="brand">
      <span>
        <Sprout size={24} />
      </span>
      Farm<span className="brand-light">wise</span>
      <i>®</i>
    </div>
  );
}
function Field({ label, ...props }: { label: string; [key: string]: any }) {
  const { t } = useLanguage();
  return (
    <label className="field">
      <span>{t(label as string)}</span>
      <input {...props} />
    </label>
  );
}
function Badge({
  children,
  tone = "green",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  const { t } = useLanguage();
  return <span className={"badge " + tone}>{children}</span>;
}
function PanelHead({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <div className="panel-head">
      <div>
        <h2>{t(title)}</h2>
        {sub && <p>{t(sub)}</p>}
      </div>
      {action}
    </div>
  );
}
function Stat({
  label,
  value,
  note,
  accent,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  accent?: boolean;
  icon?: React.ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <article className={"stat " + (accent ? "accent" : "")}>
      <div>
        <span>{t(label as string)}</span>
        {icon && <i>{icon}</i>}
      </div>
      <strong>{t(value)}</strong>
      <small>{t(note)}</small>
    </article>
  );
}
function Empty({
  title,
  description,
  action,
  label,
}: {
  title: string;
  description: string;
  action?: () => void;
  label?: string;
}) {
  const { t } = useLanguage();
  return (
    <div className="empty">
      <span>
        <Sprout size={26} />
      </span>
      <h3>{t(title)}</h3>
      <p>{t(description)}</p>
      {action && (
        <button className="button" onClick={action}>
          <Plus size={15} />
          {t(label || "Add record")}
        </button>
      )}
    </div>
  );
}
function Table({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i}>{t(h)}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
function CostChart({ entries }: { entries: R[] }) {
  const { t } = useLanguage();
  const money = (value: number) => t(formatMoney(value));
  const sums = categories
    .map((category) => ({
      category,
      value: entries
        .filter((e) => e.kind === "expense" && e.payload.category === category)
        .reduce((s, e) => s + e.payload.amount, 0),
    }))
    .filter((c) => c.value);
  const total = sums.reduce((s, c) => s + c.value, 0);
  if (!total)
    return (
      <Empty
        title={t("Every rupee has a story")}
        description={t("Record expenses to see how your cultivation costs are distributed.")}
      />
    );
  return (
    <div className="cost-bars">
      {sums
        .sort((a, b) => b.value - a.value)
        .map((c, i) => (
          <div key={t(c.category)}>
            <div>
              <span>{t(c.category)}</span>
              <strong>{money(c.value)}</strong>
            </div>
            <div className="bar">
              <i
                style={{
                  width: (c.value / total) * 100 + "%",
                  background: ["#235742", "#84a78d", "#c0d882", "#d8b57c"][
                    i % 4
                  ],
                }}
              />
            </div>
            <small>
              {Math.round((c.value / total) * 100)}{t("% of recorded costs")}</small>
          </div>
        ))}
    </div>
  );
}
function CultivationPriceHistory({ crop, historical }: { crop: string; historical: R[] }) {
  const { t } = useLanguage();
  const [market, setMarket] = useState("all"), [choice, setChoice] = useState<string | null>(null);
  const product = choice || defaultHistoricalProduct(historical, crop, market);
  const variants = [...new Set(historical.filter(row => matchesCrop(row, crop)).map(row => row.product))];
  const { records, usable, reason } = historySelection(historical, product, market);
  const markets = [...new Set(historical.filter(row => matchesCrop(row, crop)).map(row => row.claimedMarket))].sort();
  return <section className="panel cultivation-prices">
    <PanelHead title={t("Previous prices for your crop")} sub={t(crop)} />
    <p className="helper">{t("Historical prices are unverified reference ranges, not today's selling price or a prediction. Original variants and markets remain separate.")}</p>
    <div className="market-filters">
      <label className="field"><span>{t("Product / original variant")}</span>
        <select value={product} onChange={e => setChoice(e.target.value)}>
          {[...new Set([...variants, product])].sort().map(name => <option key={name} value={name}>{t(name)}</option>)}
        </select>
      </label>
      <label className="field"><span>{t("Claimed market")}</span>
        <select value={market} onChange={e => {setMarket(e.target.value); setChoice(null);}}>
          <option value="all">{t("All markets")}</option>
          {markets.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
      </label>
    </div>
    {reason && <p className="notice" role="status">{t(reason)}</p>}
    <PriceChart rows={usable} />
    {!!records.length && <details className="price-originals"><summary>{t("Original observations")}</summary>
      <Table headers={["Date", "Original product label", "Claimed market", "Lower / upper", "Source / status"]}>
        {records.map(row => <tr key={row.id}><td>{row.date}</td><td>{row.originalLabel}</td><td>{row.market}</td>
          <td>{row.lower ?? t("Missing")} / {row.upper ?? t("Missing")}</td>
          <td>{row.source} · {row.sheet}!{row.cells}<small>{t(row.state)} · {row.marketIdentity === "uncertain" ? t("Excluded from chart") : t("Claimed, unverified")}</small></td>
        </tr>)}
      </Table>
    </details>}
  </section>;
}
function PriceChart({ rows }: { rows: R[] }) {
  const { t } = useLanguage();
  const chart = priceChartGeometry(rows);
  if (!chart) return <Empty title={t("No usable price diagram")}
    description={t("A chart needs complete price bounds with clear market identity. Available original records are shown separately.")} />;
  const colors = ["#235742", "#93672e", "#476aab", "#8a5379", "#427b79"];
  return <div className="price-chart">
    <svg viewBox="0 0 880 230" role="img" aria-label={t("Historical range midpoints over actual calendar dates")}>
      {[0, 0.5, 1].map(tick => <g key={tick}>
        <line x1="65" x2="815" y1={40 + tick * 145} y2={40 + tick * 145} stroke="#e4e9e2" strokeDasharray="4 5" />
        <text x="0" y={44 + tick * 145} fill="#718078" fontSize="12">{number(chart.high - tick * (chart.high - chart.low))}</text>
      </g>)}
      {chart.series.map((series, index) => <g key={series.label}>
        {series.points.length > 1 && <polyline fill="none" stroke={colors[index % colors.length]} strokeWidth="2.5"
          points={series.points.map(row => `${chart.x(row)},${chart.y((row.lower + row.upper) / 2)}`).join(" ")} />}
        {series.points.map(row => <g key={row.id}>
          <line x1={chart.x(row)} x2={chart.x(row)} y1={chart.y(row.lower)} y2={chart.y(row.upper)} stroke={colors[index % colors.length]} strokeWidth="4" opacity="0.5" />
          <circle cx={chart.x(row)} cy={chart.y((row.lower + row.upper) / 2)} r="5" fill={colors[index % colors.length]}>
            <title>{`${series.label} · ${row.date}: ${row.lower}–${row.upper}${t(", midpoint")} ${(row.lower + row.upper) / 2} ${t("LKR/kg · unverified")}`}</title>
          </circle>
        </g>)}
      </g>)}
      <text x={chart.first === chart.last ? "440" : "65"} textAnchor={chart.first === chart.last ? "middle" : "start"} y="218" fill="#718078" fontSize="12">{new Date(chart.first).toISOString().slice(0,10)}</text>
      {chart.first !== chart.last && <text x="815" textAnchor="end" y="218" fill="#718078" fontSize="12">{new Date(chart.last).toISOString().slice(0,10)}</text>}
    </svg>
    <ul className="price-legend" aria-label={t("Price series")}>
      {chart.series.map((series, index) => <li key={series.label}><i style={{background: colors[index % colors.length]}} />{series.label}</li>)}
    </ul>
    <p className="helper">{t("Historical range midpoint · unverified · LKR/kg")}</p>
  </div>;
}
