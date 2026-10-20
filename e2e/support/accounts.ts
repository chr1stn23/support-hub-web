export type RoleKey = 'admin' | 'agent' | 'assets' | 'user';

export const ACCOUNTS: Record<RoleKey, { readonly email: string; readonly statePath: string }> = {
  admin: { email: 'admin@supporthub.local', statePath: 'e2e/.auth/admin.json' },
  agent: { email: 'agent@supporthub.local', statePath: 'e2e/.auth/agent.json' },
  assets: { email: 'assets@supporthub.local', statePath: 'e2e/.auth/assets.json' },
  user: { email: 'user@supporthub.local', statePath: 'e2e/.auth/user.json' },
};

/** Sin sesión: para las pruebas que tienen que empezar desde fuera. */
export const NO_SESSION = { cookies: [], origins: [] };
