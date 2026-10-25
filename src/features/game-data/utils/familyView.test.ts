import { DEFAULT_BASE_FILTERS, type BaseFilters } from '../store/gameDataSlice';
import { buildBaseFamilies } from './baseFamilies';
import { buildFamilyView, visibleFamilyTiers, type FamilyView } from './familyView';
import { BASES, TYPES } from './testBases.mock';

const MODEL = buildBaseFamilies(BASES, TYPES);
const TYPE_NAMES = new Map(TYPES.map((t) => [t.code, t.name]));

const viewOf = (patch: Partial<BaseFilters>) => buildFamilyView(MODEL, { ...DEFAULT_BASE_FILTERS, ...patch }, TYPE_NAMES);

/** Rows as cell codes, a dimmed member prefixed with `~`. */
const rowCodes = (view: FamilyView) =>
  view.groups.flatMap((group) =>
    group.types.flatMap((t) => t.rows.map((row) => row.cells.map((cell) => cell && `${cell.matches ? '' : '~'}${cell.base.code}`)))
  );
const lonerCodes = (view: FamilyView) => view.loners.map((loner) => loner.base.code);

describe('visibleFamilyTiers', () => {
  it('shows every column without a tier filter and only the selected family tiers with one', () => {
    expect(visibleFamilyTiers([])).toEqual(['normal', 'exceptional', 'elite']);
    expect(visibleFamilyTiers(['elite', 'normal', 'mythical'])).toEqual(['normal', 'elite']);
    expect(visibleFamilyTiers(['mythical'])).toEqual([]);
  });
});

describe('buildFamilyView', () => {
  it('shows every family and the bases without one by default', () => {
    const view = viewOf({});
    expect(rowCodes(view)).toEqual([
      ['ktr', '9ar', '7ar'],
      ['cap', 'xap', 'yap'],
    ]);
    expect(lonerCodes(view)).toEqual(['q86', 'm01', 'rin']);
    expect(view.loners.map((loner) => loner.typeName)).toEqual(['Claw B', 'Helm', 'Ring']);
    expect(view.counts).toEqual({ families: 2, totalFamilies: 2, members: 6, matching: 6, loners: 3 });
  });

  it('hides tier columns instead of rows, and loose bases of the hidden tiers', () => {
    const view = viewOf({ tiers: ['elite', 'mythical'] });
    expect(view.columns).toEqual(['elite']);
    expect(rowCodes(view)).toEqual([['7ar'], ['yap']]);
    expect(lonerCodes(view)).toEqual(['m01']);
    expect(view.counts).toMatchObject({ families: 2, members: 2, matching: 2 });
  });

  it('keeps a family with one matching member and dims the others', () => {
    const view = viewOf({ search: 'hood' });
    expect(rowCodes(view)).toEqual([['~cap', '~xap', 'yap']]);
    expect(lonerCodes(view)).toEqual(['m01']);
    expect(view.counts).toEqual({ families: 1, totalFamilies: 2, members: 3, matching: 1, loners: 1 });
    expect(rowCodes(viewOf({ maxReqLvl: 10, classOnly: 'none' }))).toEqual([['cap', 'xap', '~yap']]);
  });

  it('drops a family whose only matches sit in hidden columns', () => {
    expect(rowCodes(viewOf({ search: 'hood', tiers: ['normal'] }))).toEqual([]);
    expect(rowCodes(viewOf({ search: 'suwayyah', tiers: ['elite'] }))).toEqual([['7ar']]);
  });

  it('matches a family spanning two types through either type', () => {
    expect(rowCodes(viewOf({ types: ['h2h2'] }))).toEqual([['~ktr', '~9ar', '7ar']]);
    expect(lonerCodes(viewOf({ types: ['h2h2'] }))).toEqual(['q86']);
  });

  it('ignores the sort', () => {
    expect(viewOf({ sort: 'name', sortDir: 'desc' })).toEqual(viewOf({}));
  });
});
