/**
 * Reduces an address to the single form both sides of the comparison agree on.
 *
 * Both sides need it: the panel returns whatever was typed into its node form,
 * and Express hands back an IPv4-mapped IPv6 address (`::ffff:1.2.3.4`) for any
 * v4 client on a dual-stack socket. Comparing those two raw would report every
 * connected user as unprotected.
 */
export function normalizeIp(raw: string | undefined | null): string | null {
  if (!raw) return null;

  let ip = raw.trim().toLowerCase();
  if (!ip) return null;

  // `[2001:db8::1]:443` — bracketed v6 with a port.
  const bracketed = ip.match(/^\[(.+)\](?::\d+)?$/);
  if (bracketed) ip = bracketed[1];

  // `1.2.3.4:5678` — a port on a v4 address. A bare v6 also contains colons,
  // so only strip when exactly one is present.
  if (ip.split(':').length === 2 && ip.includes('.')) ip = ip.split(':')[0];

  // `fe80::1%eth0` — a link-local zone index, meaningless across hosts.
  ip = ip.split('%')[0];

  // `::ffff:1.2.3.4` — v4 wearing a v6 costume.
  const mapped = ip.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) ip = mapped[1];

  return ip || null;
}
