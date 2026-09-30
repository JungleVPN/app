import type { NodeStatDto } from '@workspace/types';
import { useEffect, useState } from 'react';
import type { createRemnawaveApi } from '../api';

type RemnawaveApi = ReturnType<typeof createRemnawaveApi>;

export type NodeStatsState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; nodes: NodeStatDto[] };

export function useNodeStats(remnawaveApi: RemnawaveApi): NodeStatsState {
  const [state, setState] = useState<NodeStatsState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    remnawaveApi
      .getNodeStats(controller.signal)
      .then((nodes) => {
        if (!controller.signal.aborted) setState({ status: 'ready', nodes });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'error' });
      });

    return () => controller.abort();
  }, [remnawaveApi]);

  return state;
}
