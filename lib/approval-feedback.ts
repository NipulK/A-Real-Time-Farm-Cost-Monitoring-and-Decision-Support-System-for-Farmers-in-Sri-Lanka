export const REJECTED_APPLICATION_MESSAGE =
  "Sorry, your organization application could not be accepted. Please contact the system administrator for further assistance.";
export const APPROVED_APPLICATION_MESSAGE =
  "Welcome to Farmwise! Your organization application has been approved.";

// Keep the existing application visible until the owner acknowledges the decision.
export async function acknowledgeApproval(
  status: string,
  effects: { notify: (message: string) => void | Promise<void>; openDashboard: () => void; signOut: () => Promise<void> },
) {
  if (status === "approved") {
    await effects.notify(APPROVED_APPLICATION_MESSAGE);
    effects.openDashboard();
    return true;
  }
  if (status === "rejected") {
    await effects.notify(REJECTED_APPLICATION_MESSAGE);
    await effects.signOut();
    return true;
  }
  return false;
}
