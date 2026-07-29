import { createPublicKey, createVerify, JsonWebKey } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';

export type SupabaseJwtPayload = {
  sub: string;
  email: string;
  exp: number;
};

/**
 * Validates a Supabase-issued ES256 JWT using the project public key (JWK).
 * Supabase holds the private key and signs tokens; we only ever hold the
 * public key — no shared secret is needed on the client side.
 *
 * JWT ES256 signatures are raw r||s (64 bytes). Node's createVerify accepts
 * them directly via the ieee-p1363 dsaEncoding option, avoiding manual DER
 * conversion.
 */
export function parseSupabaseJwt(token: string, publicKeyJwk: string): SupabaseJwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) throw new UnauthorizedException('Invalid JWT format');

  const [header, payload, signature] = parts;

  let jwk: JsonWebKey;
  try {
    jwk = JSON.parse(publicKeyJwk) as JsonWebKey;
  } catch {
    throw new Error('SUPABASE_JWT_PUBLIC_KEY must be valid JSON');
  }

  const publicKey = createPublicKey({ key: jwk, format: 'jwk' });
  const rawSig = Buffer.from(signature, 'base64url');

  const verifier = createVerify('SHA256');
  verifier.update(`${header}.${payload}`);

  if (!verifier.verify({ key: publicKey, dsaEncoding: 'ieee-p1363' }, rawSig)) {
    throw new UnauthorizedException('Invalid JWT signature');
  }

  let decoded: SupabaseJwtPayload;
  try {
    decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SupabaseJwtPayload;
  } catch {
    throw new UnauthorizedException('Malformed JWT payload');
  }

  if (decoded.exp * 1000 < Date.now()) throw new UnauthorizedException('JWT has expired');
  if (!decoded.email) throw new UnauthorizedException('Missing email claim in JWT');
  if (!decoded.sub) throw new UnauthorizedException('Missing sub claim in JWT');

  return decoded;
}
