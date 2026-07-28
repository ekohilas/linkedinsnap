import { createSignal, onMount, onCleanup } from 'solid-js';

const STORAGE_KEY = 'linkedinsnap:username';

function readStoredParam() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function storeParam(value: string) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Storage unavailable (private browsing, quota); remembering is best-effort.
  }
}

export function useHashParam() {
  const initial = window.location.hash.substring(1) || readStoredParam();

  // Restored from storage: put the hash back so the URL stays shareable.
  if (initial && !window.location.hash) {
    history.replaceState(null, '', `#${initial}`);
  }
  if (initial) {
    storeParam(initial);
  }

  const [param, setParam] = createSignal(initial);

  const handleHashChange = () => {
    const next = window.location.hash.substring(1);
    setParam(next);
    if (next) {
      storeParam(next);
    }
  };

  onMount(() => {
    window.addEventListener('hashchange', handleHashChange);
  });

  onCleanup(() => {
    window.removeEventListener('hashchange', handleHashChange);
  });

  return param;
}
