"use client";
import { useEffect, useRef, useState } from "react";
import { Check, ShieldCheck, CircleAlert } from "lucide-react";
import { APPROVED_APPLICATION_MESSAGE } from "../lib/approval-feedback";

export function OrganizationRegistrationSteps({ status = "draft", section = "details" }: { status?: string; section?: string }) {
  const terminal = status === "approved" || status === "rejected";
  const current = status === "draft" ? (section === "land" ? 1 : 0) : terminal ? 4 : 3;
  const labels = ["Organization details", "Land & documents", "Submitted", "Admin review", status === "rejected" ? "Rejected" : "Approved"];
  const description = status === "needs_info" ? "Action required: review the administrator’s feedback, update your application and resubmit." : status === "rejected" ? "Application rejected. Please contact the system administrator for further assistance." : status === "approved" ? "Registration complete. Your organization is approved." : status === "draft" ? "Complete your details and land documents, then submit for administrator review." : "Application submitted. Waiting for the administrator’s decision.";
  return <section className="organization-progress" aria-label="Organization registration progress">
    <strong>Organization registration</strong>
    <ol>{labels.map((label, index) => <li key={index} aria-current={index === current ? "step" : undefined} className={`${index === current ? "current" : ""} ${status !== "draft" && index < current ? "complete" : ""} ${status === "rejected" && index === 4 ? "rejected" : ""}`}><span aria-hidden="true">{status !== "draft" && index < current ? <Check size={16}/> : index + 1}</span><small>{label}{index === 3 && status === "needs_info" && <b>Action required</b>}</small></li>)}</ol>
    <p role="status">{description}</p>
  </section>;
}

export function ApprovalDecisionDialog({ message, onConfirm }: { message: string; onConfirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  const approved = message === APPROVED_APPLICATION_MESSAGE;
  return <dialog ref={dialog} className="approval-dialog" aria-labelledby="approval-dialog-title" aria-describedby="approval-dialog-message" onCancel={event => event.preventDefault()}>
    <div className={`approval-dialog-icon ${approved ? "approved" : "rejected"}`} aria-hidden="true">{approved ? <ShieldCheck size={30}/> : <CircleAlert size={30}/>}</div>
    <span className="eyebrow">FARMWISE · ORGANIZATION REGISTRATION</span>
    <h2 id="approval-dialog-title">{approved ? "Welcome to Farmwise" : "Application not accepted"}</h2>
    <p id="approval-dialog-message">{message}</p>
    <button autoFocus className="button primary wide" onClick={onConfirm}>OK</button>
  </dialog>;
}

export function useApprovalDialog() {
  const [message, setMessage] = useState<string | null>(null);
  const resolve = useRef<(() => void) | null>(null);
  const notify = (text: string) => new Promise<void>(done => { resolve.current = done; setMessage(text); });
  const popup = message ? <ApprovalDecisionDialog message={message} onConfirm={() => { setMessage(null); resolve.current?.(); resolve.current = null; }}/> : null;
  return { notify, popup };
}
