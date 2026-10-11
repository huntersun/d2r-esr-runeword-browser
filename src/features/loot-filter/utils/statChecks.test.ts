import {
  formatStatCheck,
  newStatCheck,
  parseStatInput,
  removeStatCheck,
  replaceStatCheck,
  setStatOp,
  setStatParam,
  setStatValue,
} from './statChecks';
import { EMPTY_LOOKUP } from './lookup';
import { TEST_LOOKUP } from './testLookup.mock';

describe('stat check helpers', () => {
  it('starts a row with no stat, >= 1', () => {
    expect(newStatCheck('strength')).toEqual({ stat: 'strength', op: '>=', value: 1 });
  });

  it('reads a typed stat as an id or a name', () => {
    expect(parseStatInput(' 194 ')).toBe(194);
    expect(parseStatInput('item_numsockets')).toBe('item_numsockets');
    expect(parseStatInput('  ')).toBeNull();
    expect(parseStatInput('-1')).toBe('-1');
  });

  it('turns the value into a pair for between and back', () => {
    const between = setStatOp({ stat: 'strength', value: 5 }, 'between');
    expect(between).toEqual({ stat: 'strength', op: 'between', value: [5, 5] });
    expect(setStatOp({ stat: 'strength', op: 'between', value: [3, 9] }, '<')).toEqual({ stat: 'strength', op: '<', value: 3 });
  });

  it('sets values, params and rows', () => {
    expect(setStatValue({ stat: 0, value: [1, 2] }, 1, 8)).toEqual({ stat: 0, value: [1, 8] });
    expect(setStatValue({ stat: 0, value: 1 }, 0, 4)).toEqual({ stat: 0, value: 4 });
    expect(setStatParam({ stat: 0, param: 3, value: 1 }, undefined)).toEqual({ stat: 0, value: 1 });
    expect(setStatParam({ stat: 0, value: 1 }, 2)).toEqual({ stat: 0, value: 1, param: 2 });
    const list = [
      { stat: 0, value: 1 },
      { stat: 1, value: 2 },
    ];
    expect(replaceStatCheck(list, 1, { stat: 2, value: 3 })).toEqual([list[0], { stat: 2, value: 3 }]);
    expect(removeStatCheck(list, 0)).toEqual([list[1]]);
    expect(removeStatCheck([list[0]], 0)).toBeUndefined();
  });

  it('formats a check with the stat name when known', () => {
    expect(formatStatCheck({ stat: 194, op: '>=', value: 2 }, TEST_LOOKUP)).toBe('item_numsockets ≥2');
    expect(formatStatCheck({ stat: 194, value: 2 }, EMPTY_LOOKUP)).toBe('#194 ≥2');
    expect(formatStatCheck({ stat: 'strength', param: 1, op: 'between', value: [5, 10] }, TEST_LOOKUP)).toBe('strength[1] 5–10');
    expect(formatStatCheck({ stat: '', op: '==', value: 0 }, TEST_LOOKUP)).toBe('? ==0');
  });
});
