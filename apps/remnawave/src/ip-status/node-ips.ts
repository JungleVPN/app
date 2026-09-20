import { normalizeIp } from './normalize-ip';

/**
 * Inventory roles that still carry visitor traffic. Anything else — BLOCKED,
 * DEPRECATED, RESERVE, FLAGGED, MONITORING, MANAGEMENT — is an address a
 * visitor cannot currently be exiting through, so matching it would tell
 * someone they are protected when they are not.
 */
const LIVE_IP_STATUSES = new Set(['OUTBOUND', 'INBOUND', 'TRANSIT']);

type NodeIpEntry = { ip: string; status: string };

type NodeLike = {
  address: string;
  countryCode: string;
  isDisabled: boolean;
  ips?: NodeIpEntry[];
};

/**
 * Every address a visitor could plausibly be seen coming from, mapped to the
 * country the panel reports for the node that owns it.
 */
export function collectNodeIps(nodes: readonly NodeLike[]): Map<string, string> {
  const ips = new Map<string, string>();

  for (const node of nodes) {
    if (node.isDisabled) continue;

    const addresses = [
      node.address,
      ...(node.ips ?? []).filter((entry) => LIVE_IP_STATUSES.has(entry.status)).map((e) => e.ip),
    ];

    for (const address of addresses) {
      const ip = normalizeIp(address);
      if (ip) ips.set(ip, node.countryCode);
    }
  }

  return ips;
}
