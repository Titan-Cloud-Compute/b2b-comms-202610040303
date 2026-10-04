// AUTO-GENERATED — do not edit by hand

export interface Session {
  email: string;
  role: string;
  userId: string;
}

export const ACTOR_RESOLVE = { entity: 'User', by: 'email' } as const;

export const DEMO_ACCOUNTS = [{ role: 'admin', email: 'admin@b2b-portal.example.com' }, { role: 'vendor', email: 'vendor@acme.example.com' }, { role: 'customer', email: 'buyer@corp.example.com' }] as const;
