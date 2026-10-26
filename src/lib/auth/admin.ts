import 'server-only';

/** Администратор сервиса (не путать с владельцем аккаунта): адреса из ADMIN_EMAILS. В разработке — все. */
export function isServiceAdmin(email: string): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  return (process.env.ADMIN_EMAILS ?? '').toLowerCase().split(',').map((x) => x.trim()).includes(email.toLowerCase());
}
