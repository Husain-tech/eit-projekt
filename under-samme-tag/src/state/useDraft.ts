import { useCallback, useEffect, useState } from 'react';
import { clearDraft, loadDraft, saveDraft } from '../data/store';

/**
 * Form state that survives a page reload. Use it like useState.
 * Call the third value when the form has been saved, to forget the draft.
 */
export function useDraft<T>(key: string, initial: T): [T, (change: Partial<T>) => void, () => void] {
  const [value, setValue] = useState<T>(() => ({ ...initial, ...(loadDraft<Partial<T>>(key) ?? {}) }));

  useEffect(() => {
    saveDraft(key, value);
  }, [key, value]);

  const update = useCallback((change: Partial<T>) => setValue((v) => ({ ...v, ...change })), []);
  const forget = useCallback(() => clearDraft(key), [key]);

  return [value, update, forget];
}
