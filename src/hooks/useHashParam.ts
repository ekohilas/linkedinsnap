import { createSignal, onMount, onCleanup } from 'solid-js';

export function useHashParam() {
  const [param, setParam] = createSignal(window.location.hash.substring(1));

  const handleHashChange = () => {
    setParam(window.location.hash.substring(1));
  };

  onMount(() => {
    window.addEventListener('hashchange', handleHashChange);
  });

  onCleanup(() => {
    window.removeEventListener('hashchange', handleHashChange);
  });

  return param;
}
