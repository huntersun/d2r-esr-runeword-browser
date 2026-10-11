import { codeCustom, idCustom, valuesToIds } from './customOptions';

describe('codeCustom', () => {
  it('offers any code without spaces', () => {
    expect(codeCustom('item')('r33')).toEqual({ value: 'r33', label: 'Add item code “r33”' });
    expect(codeCustom('item')('two words')).toBeNull();
  });
});

describe('idCustom', () => {
  it('offers whole numbers of up to six digits, normalised', () => {
    expect(idCustom('area')('007')).toEqual({ value: '7', label: 'Add area id 7' });
    expect(idCustom('area')('999999')).toEqual({ value: '999999', label: 'Add area id 999999' });
    expect(idCustom('area')('1234567')).toBeNull();
    expect(idCustom('area')('-1')).toBeNull();
    expect(idCustom('area')('1.5')).toBeNull();
    expect(idCustom('area')('abc')).toBeNull();
  });
});

describe('valuesToIds', () => {
  it('keeps whole numbers and drops the rest', () => {
    expect(valuesToIds(['1', '40', 'x', '2.5', ''])).toEqual([1, 40]);
  });
});
