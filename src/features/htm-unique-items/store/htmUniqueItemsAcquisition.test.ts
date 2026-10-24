import { describe, expect, it } from 'vitest';
import htmUniqueItemsReducer, { setAcquisition } from './htmUniqueItemsSlice';

describe('htmUniqueItemsSlice acquisition', () => {
  it('defaults to All and stores the chip value', () => {
    const initial = htmUniqueItemsReducer(undefined, { type: '@@INIT' });
    expect(initial.acquisition).toBe('all');
    expect(htmUniqueItemsReducer(initial, setAcquisition('gamble')).acquisition).toBe('gamble');
  });
});
