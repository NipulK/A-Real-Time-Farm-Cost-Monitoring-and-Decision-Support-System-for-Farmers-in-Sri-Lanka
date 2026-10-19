type R = Record<string, any>;
export function adminSummary(data: R) {
  const users: R[] = data.users || [], organizations: R[] = data.organizations || [], cultivations: R[] = data.cultivations || [];
  return {
    users: users.length,
    active: users.filter(u => !!u.active).length,
    inactive: users.filter(u => !u.active).length,
    roles: Object.fromEntries(['independent','organization_owner','organization_farmer','supervisor','admin'].map(role => [role, users.filter(u => (u.account_type || (u.role === 'admin' ? 'admin' : 'unknown')) === role).length])),
    organizations: organizations.length,
    statuses: Object.fromEntries(['pending','approved','needs_info','rejected'].map(status => [status, organizations.filter(o => o.status === status).length])),
    lands: (data.lands || []).length,
    cultivations: cultivations.length,
    awaitingValidation: cultivations.filter(c => c.status === 'closed' && !c.validated).length,
    validated: cultivations.filter(c => !!c.validated).length,
    records: (data.entries || []).filter((e: R) => !e.voided).length,
  };
}
