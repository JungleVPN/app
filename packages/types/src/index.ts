/**
 * Shared type definitions for the JungleVPN monorepo.
 *
 * Each domain has its own subdirectory. This barrel re-exports everything
 * so consumers can still do `import { ... } from '@workspace/types'`.
 */

export * from './api-routes';
export * from './attribution';
export * from './payments';
export * from './remnawave';
export * from './supabase';
