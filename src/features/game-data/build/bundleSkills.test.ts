import { describe, expect, it } from 'vitest';
import { buildSkillsBundle, type SkillsInput } from './bundleSkills.ts';
import { parseTsv } from './tsv.ts';

/** Rows as column → value records, so a test names only the cells it needs */
function table(columns: readonly string[], rows: readonly Record<string, string>[]) {
  return parseTsv([columns.join('\t'), ...rows.map((row) => columns.map((column) => row[column] ?? '').join('\t'))].join('\n'));
}

const SKILL_COLUMNS = ['skill', 'charclass', 'skilldesc', 'reqlevel', 'maxlvl', 'reqskill1', 'reqskill2', 'reqskill3'];
const DESC_COLUMNS = ['skilldesc', 'SkillPage', 'SkillRow', 'SkillColumn', 'str name'];

const skill = (id: string, cls: string, desc: string, reqlevel: string, ...reqs: string[]) => ({
  skill: id,
  charclass: cls,
  skilldesc: desc,
  reqlevel,
  maxlvl: '20',
  reqskill1: reqs[0] ?? '',
  reqskill2: reqs[1] ?? '',
  reqskill3: reqs[2] ?? '',
});
const desc = (id: string, page: string, row: string, col: string, name: string) => ({
  skilldesc: id,
  SkillPage: page,
  SkillRow: row,
  SkillColumn: col,
  'str name': name,
});

function input(): SkillsInput {
  return {
    skills: table(SKILL_COLUMNS, [
      skill('Attack', '', 'attack', '1'),
      skill('Summon Tainted', 'war', 'summon tainted', '12', 'Summon Goatman'),
      skill('Summon Goatman', 'war', 'summon goatman', '1'),
      skill('Levitate', 'war', 'levitate', '1'),
      skill('Flame Wave', 'war', 'flame wave', '6', 'Hellfire Lance', 'Missing Skill'),
      skill('Hellfire Lance', 'war', 'hellfire lance', '1'),
      skill('Hidden', 'war', 'hidden', '1'),
      skill('No Desc', 'war', 'nothing', '1'),
      skill('Fire Bolt', 'sor', 'fire bolt', '1'),
    ]),
    skilldesc: table(DESC_COLUMNS, [
      desc('attack', '0', '0', '0', 'AttackName'),
      desc('summon goatman', '1', '1', '1', 'SummonGoatmanName'),
      desc('summon tainted', '1', '3', '1', 'SummonTaintedName'),
      desc('levitate', '1', '1', '3', 'NoSuchKey'),
      desc('flame wave', '3', '2', '2', 'FlameWaveName'),
      desc('hellfire lance', '3', '1', '2', 'HellfireLanceName'),
      desc('hidden', '0', '1', '1', 'HiddenName'),
      desc('fire bolt', '1', '1', '2', 'FireBoltName'),
    ]),
    experience: table(
      ['Level', 'Amazon', 'Sorceress', 'Warlock', 'ExpRatio'],
      [
        { Level: 'MaxLvl', Amazon: '110', Sorceress: '110', Warlock: '110', ExpRatio: '10' },
        { Level: '0', Amazon: '0', Sorceress: '0', Warlock: '0', ExpRatio: '1024' },
      ]
    ),
    classes: [
      { code: 'sor', name: 'Sorceress', tabs: ['Fire Skills', 'Lightning Skills', 'Cold Skills'] },
      { code: 'war', name: 'Warlock', tabs: ['Demon Skills', 'Eldritch Skills', 'Curses'] },
    ],
    strings: new Map([
      ['SummonGoatmanName', 'Summon Goatman'],
      ['SummonTaintedName', 'Summon Tainted'],
      ['FlameWaveName', 'Flame Wave'],
      ['HellfireLanceName', 'Hellfire Lance'],
      ['FireBoltName', 'Fire Bolt'],
    ]),
  };
}

describe('buildSkillsBundle', () => {
  const { bundle, skipped, warnings } = buildSkillsBundle(input());
  const warlock = bundle.classes.find((cls) => cls.code === 'war');

  it('keeps the class order and three tabs per class, names without " Skills"', () => {
    expect(bundle.classes.map((cls) => cls.code)).toEqual(['sor', 'war']);
    expect(warlock?.name).toBe('Warlock');
    expect(warlock?.tabs.map((tab) => [tab.page, tab.name])).toEqual([
      [1, 'Demon'],
      [2, 'Eldritch'],
      [3, 'Curses'],
    ]);
  });

  it('places the class skills by skilldesc page, row and column (sorted), with requirements', () => {
    expect(warlock?.tabs[0]?.skills).toEqual([
      { id: 'Summon Goatman', name: 'Summon Goatman', row: 1, col: 1, reqLevel: 1, maxLevel: 20, reqSkills: [] },
      { id: 'Levitate', name: 'Levitate', row: 1, col: 3, reqLevel: 1, maxLevel: 20, reqSkills: [] },
      { id: 'Summon Tainted', name: 'Summon Tainted', row: 3, col: 1, reqLevel: 12, maxLevel: 20, reqSkills: ['Summon Goatman'] },
    ]);
    expect(warlock?.tabs[1]?.skills).toEqual([]);
    expect(warlock?.tabs[2]?.skills.map((entry) => entry.id)).toEqual(['Hellfire Lance', 'Flame Wave']);
    expect(bundle.classes[0]?.tabs[0]?.skills.map((entry) => entry.name)).toEqual(['Fire Bolt']);
  });

  it('leaves out non-class skills silently and class skills without a tab with a warning', () => {
    expect(skipped).toBe(2);
    expect(warnings).toContain('skills: war skill "Hidden" has skill page 0');
    expect(warnings).toContain('skills: war skill "No Desc" has no skilldesc row "nothing"');
    expect(warnings.some((warning) => warning.includes('Attack'))).toBe(false);
  });

  it('falls back to the id for an unresolved name and warns about unknown required skills', () => {
    expect(warnings).toContain('skills: war skill "Levitate" name "NoSuchKey" not in the strings');
    expect(warnings).toContain('skills: war skill "Flame Wave" requires unknown skill "Missing Skill"');
    expect(warnings).toHaveLength(4);
  });

  it('reads the level cap from experience.txt', () => {
    expect(bundle.maxLevel).toBe(110);
  });

  it('warns about two skills in one cell and a missing MaxLvl row', () => {
    const base = input();
    const result = buildSkillsBundle({
      ...base,
      skilldesc: table(DESC_COLUMNS, [desc('summon goatman', '1', '1', '1', 'X'), desc('summon tainted', '1', '1', '1', 'Y')]),
      skills: table(SKILL_COLUMNS, [
        skill('Summon Goatman', 'war', 'summon goatman', '1'),
        skill('Summon Tainted', 'war', 'summon tainted', '1'),
      ]),
      experience: table(['Level', 'Warlock'], [{ Level: '1', Warlock: '0' }]),
      strings: new Map([
        ['X', 'Summon Goatman'],
        ['Y', 'Summon Tainted'],
      ]),
    });
    expect(result.bundle.maxLevel).toBe(99);
    expect(result.warnings).toEqual([
      'skills: war skills "Summon Goatman" and "Summon Tainted" share tab 1/1/1 (page/row/column)',
      'skills: experience.txt has no MaxLvl row; level cap 99 assumed',
    ]);
  });
});
