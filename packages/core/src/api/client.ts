export interface ApiClientConfig {
  baseUrl: string;
  getHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  signal?: AbortSignal;
}

export interface ApiError {
  status: number;
  message: string;
  data?: unknown;
}

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly data: unknown;

  constructor({ status, message, data }: ApiError) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.data = data;
  }
}

export function createApiClient(config: ApiClientConfig) {
  async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, params, signal } = options;

    let url = `${config.baseUrl}${path}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const authHeaders = config.getHeaders ? await config.getHeaders() : {};

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });

    if (!response.ok) {
      let data: unknown;
      try {
        data = await response.json();
      } catch {
        data = await response.text();
      }

      throw new ApiClientError({
        status: response.status,
        message: `Request failed: ${method} ${path} (${response.status})`,
        data,
      });
    }

    if (response.status === 204 || response.status === 205) {
      return undefined as T;
    }

    const raw = await response.json();
    if (!raw) {
      throw new ApiClientError({
        status: response.status,
        message: `Empty response body: ${method} ${path} — check REMNAWAVE_URL / service and that the route returns JSON`,
        data: null,
      });
    }
    return raw;
  }

  return {
    get: <T>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
      request<T>(path, { ...options, method: 'GET' }),

    post: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
      request<T>(path, { ...options, method: 'POST', body }),

    put: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
      request<T>(path, { ...options, method: 'PUT', body }),

    patch: <T>(
      path: string,
      body?: unknown,
      options?: Omit<ApiRequestOptions, 'method' | 'body'>,
    ) => request<T>(path, { ...options, method: 'PATCH', body }),

    delete: <T>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
      request<T>(path, { ...options, method: 'DELETE' }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
