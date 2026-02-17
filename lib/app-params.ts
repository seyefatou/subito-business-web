'use client';

const isNode = typeof window === 'undefined';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// Create a mock storage for SSR
const createMockStorage = (): StorageLike => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  };
};

const storage: StorageLike = isNode ? createMockStorage() : window.localStorage;

const toSnakeCase = (str: string): string => {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
};

interface GetAppParamOptions {
  defaultValue?: string;
  removeFromUrl?: boolean;
}

const getAppParamValue = (
  paramName: string,
  { defaultValue, removeFromUrl = false }: GetAppParamOptions = {}
): string | null => {
  if (isNode) {
    return defaultValue ?? null;
  }

  const storageKey = `base44_${toSnakeCase(paramName)}`;
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get(paramName);

  if (removeFromUrl && searchParam) {
    urlParams.delete(paramName);
    const newUrl = `${window.location.pathname}${
      urlParams.toString() ? `?${urlParams.toString()}` : ''
    }${window.location.hash}`;
    window.history.replaceState({}, document.title, newUrl);
  }

  if (searchParam) {
    storage.setItem(storageKey, searchParam);
    return searchParam;
  }

  if (defaultValue) {
    storage.setItem(storageKey, defaultValue);
    return defaultValue;
  }

  const storedValue = storage.getItem(storageKey);
  if (storedValue) {
    return storedValue;
  }

  return null;
};

export interface AppParams {
  appId: string | null;
  token: string | null;
  fromUrl: string | null;
  functionsVersion: string | null;
  appBaseUrl: string | null;
}

const getAppParams = (): AppParams => {
  if (isNode) {
    return {
      appId: process.env.NEXT_PUBLIC_BASE44_APP_ID ?? null,
      token: null,
      fromUrl: null,
      functionsVersion: process.env.NEXT_PUBLIC_BASE44_FUNCTIONS_VERSION ?? null,
      appBaseUrl: process.env.NEXT_PUBLIC_BASE44_APP_BASE_URL ?? null,
    };
  }

  if (getAppParamValue('clear_access_token') === 'true') {
    storage.removeItem('base44_access_token');
    storage.removeItem('token');
  }

  return {
    appId: getAppParamValue('app_id', {
      defaultValue: process.env.NEXT_PUBLIC_BASE44_APP_ID,
    }),
    token: getAppParamValue('access_token', { removeFromUrl: true }),
    fromUrl: getAppParamValue('from_url', {
      defaultValue: typeof window !== 'undefined' ? window.location.href : undefined,
    }),
    functionsVersion: getAppParamValue('functions_version', {
      defaultValue: process.env.NEXT_PUBLIC_BASE44_FUNCTIONS_VERSION,
    }),
    appBaseUrl: getAppParamValue('app_base_url', {
      defaultValue: process.env.NEXT_PUBLIC_BASE44_APP_BASE_URL,
    }),
  };
};

export const appParams: AppParams = getAppParams();
