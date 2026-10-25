import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { BaseItem, BasesBundle, TypesBundle } from '../engine/schema';
import { FAMILY_TIERS, baseStatLine, buildBaseFamilies, familyHead, familyMembers, isFamilyRow, type BaseFamilyType } from './baseFamilies';
import { BASES, TYPES } from './testBases.mock';

const allTypes = (groups: ReturnType<typeof buildBaseFamilies>): BaseFamilyType[] => groups.flatMap((group) => group.types);
const names = (t: BaseFamilyType) => t.rows.map((row) => FAMILY_TIERS.map((tier) => row.cells[tier]?.name ?? null));

describe('buildBaseFamilies', () => {
  const groups = buildBaseFamilies(BASES, TYPES);
  const findType = (code: string): BaseFamilyType => {
    const found = allTypes(groups).find((t) => t.code === code);
    if (found === undefined) throw new Error(`no type ${code}`);
    return found;
  };

  it('groups types like the type picker', () => {
    expect(groups.map((group) => [group.label, group.types.map((t) => t.code)])).toEqual([
      ['Class weapons', ['h2h1', 'h2h2']],
      ['Armor', ['helm']],
      ['Accessories', ['ring']],
    ]);
  });

  it('puts a family in one row under its lowest member’s type, even across types', () => {
    expect(names(findType('helm'))).toEqual([['Cap', 'War Hat', 'Hood']]);
    expect(names(findType('h2h1'))).toEqual([['Katar', 'Quhab', 'Suwayyah']]);
  });

  it('gives duplicates and self-referential bases single-member rows, mythical bases apart', () => {
    const h2h2 = findType('h2h2');
    expect(h2h2.rows.map((row) => familyMembers(row).map((b) => b.code))).toEqual([['q86']]);
    expect(h2h2.rows.map(isFamilyRow)).toEqual([false]);
    expect(findType('ring').rows.map((row) => familyHead(row).code)).toEqual(['rin']);
    expect(findType('helm').mythical.map((b) => b.code)).toEqual(['m01']);
  });

  it('summarises the compared stats', () => {
    expect(baseStatLine(BASES[5] as BaseItem)).toBe('1H 4–7 · Speed 0 · 2 os · qlvl 1');
    expect(baseStatLine(BASES[1] as BaseItem)).toBe('Def 3–5 · Str 20 · 2 os · qlvl 22');
  });
});

describe('buildBaseFamilies on the committed bundles', () => {
  const dir = resolve(__dirname, '../../../../public/game-data');
  const { bases } = JSON.parse(readFileSync(resolve(dir, 'bases.json'), 'utf-8')) as BasesBundle;
  const { types } = JSON.parse(readFileSync(resolve(dir, 'types.json'), 'utf-8')) as TypesBundle;
  const typeList = allTypes(buildBaseFamilies(bases, types));
  const rows = typeList.flatMap((t) => t.rows.map((row) => ({ type: t.code, row })));
  const families = rows.filter(({ row }) => isFamilyRow(row));

  it('places every base exactly once', () => {
    const codes = [...rows.flatMap(({ row }) => familyMembers(row)), ...typeList.flatMap((t) => t.mythical)].map((b) => b.code);
    expect(codes).toHaveLength(bases.length);
    expect(new Set(codes).size).toBe(bases.length);
  });

  it('has 194 families, all complete normal / exceptional / elite triples', () => {
    expect(families).toHaveLength(194);
    for (const { row } of families) expect(FAMILY_TIERS.every((tier) => row.cells[tier]?.tier === tier)).toBe(true);
  });

  it('keeps the 7 claw families spanning h2h1 and h2h2 as one row under h2h1', () => {
    const spanning = families.filter(({ row }) => new Set(familyMembers(row).map((b) => b.type)).size > 1);
    expect(spanning).toHaveLength(7);
    for (const { type: code, row } of spanning) {
      expect(code).toBe('h2h1');
      expect(new Set(familyMembers(row).map((b) => b.type))).toEqual(new Set(['h2h1', 'h2h2']));
    }
  });

  it('leaves the odd bases, accessories and mythical bases without a family', () => {
    const loners = rows.filter(({ row }) => !isFamilyRow(row)).map(({ row }) => familyHead(row));
    expect(loners.map((b) => b.code)).toEqual(expect.arrayContaining(['q86', 'qdf']));
    // Besides q86 and qdf, a loner's family codes are its own code or blank
    for (const loner of loners.filter((b) => b.code !== 'q86' && b.code !== 'qdf')) {
      expect(loner.family.every((code) => code === loner.code || code === '')).toBe(true);
    }
    const mythical = typeList.flatMap((t) => t.mythical);
    expect(mythical.every((b) => b.family.every((code) => code === b.code))).toBe(true);
    expect(loners.length + mythical.length).toBe(bases.length - 194 * 3);
  });
});
