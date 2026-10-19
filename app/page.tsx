import { RegistrationAuth, RestrictedPortal } from "./registration-ui";
import { currentUser } from "@/lib/auth";
import { one, prices } from "@/lib/db";
import { snapshot } from "@/lib/service";
import { LanguageProvider } from "./language";
import Workspace from "./workspace";
import AdminWorkspace from "./admin-workspace";
import { adminSnapshot } from "@/lib/admin";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await currentUser();
  if (!user)
    return <RegistrationAuth setup={!one("SELECT id FROM users LIMIT 1")} />;
  if (user.role === "admin") return <AdminWorkspace initial={adminSnapshot(user)} historical={prices()} />;
  const data = snapshot(user);
  if (data.restricted) return <RestrictedPortal initial={data} />;
  return (
    <LanguageProvider enabled={data.user.account_type === "independent"} initial={data.user.language} persist>
    <Workspace
      initial={data}
      setup={!one("SELECT id FROM users LIMIT 1")}
      historical={user ? prices() : []}
    />
    </LanguageProvider>
  );
}
