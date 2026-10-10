/**
 * Tiny validators for YAML values (frontmatter, spine.yml, _glossary.yml, _sources.yml).
 * Every problem is pushed to `errors` as `<where>: <field>: <message>`; the caller keeps going and reports all at once.
 */
import { parse } from 'yaml';

export type YamlObject = Record<string, unknown>;

export function isObject(value: unknown): value is YamlObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Parses YAML; a syntax error is reported and yields undefined. */
export function parseYaml(text: string, where: string, errors: string[]): unknown {
  try {
    const value: unknown = parse(text);
    return value;
  } catch (error) {
    errors.push(`${where}: invalid YAML: ${error instanceof Error ? (error.message.split('\n')[0] ?? '') : String(error)}`);
    return undefined;
  }
}

export class FieldReader {
  readonly #object: YamlObject;
  readonly #where: string;
  readonly #errors: string[];

  constructor(object: YamlObject, where: string, errors: string[]) {
    this.#object = object;
    this.#where = where;
    this.#errors = errors;
  }

  error(field: string, message: string): void {
    this.#errors.push(`${this.#where}: ${field}: ${message}`);
  }

  /** Reports keys outside `known` (catches typos such as `knowfirst`). */
  onlyKeys(known: readonly string[]): void {
    for (const key of Object.keys(this.#object)) {
      if (!known.includes(key)) this.error(key, `unknown field (allowed: ${known.join(', ')})`);
    }
  }

  has(field: string): boolean {
    return this.#object[field] !== undefined && this.#object[field] !== null;
  }

  string(field: string, options: { required: true; max?: number }): string;
  string(field: string, options?: { required?: false; max?: number }): string | null;
  string(field: string, options: { required?: boolean; max?: number } = {}): string | null {
    const value = this.#object[field];
    if (value === undefined || value === null) {
      if (options.required === true) this.error(field, 'is required');
      return options.required === true ? '' : null;
    }
    if (typeof value !== 'string' || value.trim() === '') {
      this.error(field, `must be a non-empty string (got ${JSON.stringify(value)})`);
      return options.required === true ? '' : null;
    }
    const text = value.trim();
    if (options.max !== undefined && text.length > options.max) {
      this.error(field, `must be at most ${String(options.max)} characters (got ${String(text.length)})`);
    }
    return text;
  }

  strings(field: string, max?: number): string[] {
    const value = this.#object[field];
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || item.trim() === '')) {
      this.error(field, `must be a list of non-empty strings (got ${JSON.stringify(value)})`);
      return [];
    }
    const items = (value as string[]).map((item) => item.trim());
    if (max !== undefined && items.length > max)
      this.error(field, `must have at most ${String(max)} entries (got ${String(items.length)})`);
    return items;
  }

  oneOf<T extends string>(field: string, allowed: readonly T[], fallback: T): T {
    const value = this.#object[field];
    if (value === undefined || value === null) return fallback;
    const match = allowed.find((option) => option === value);
    if (match === undefined) this.error(field, `must be one of ${allowed.join(' | ')} (got ${JSON.stringify(value)})`);
    return match ?? fallback;
  }

  list(field: string): unknown[] {
    const value = this.#object[field];
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) {
      this.error(field, 'must be a list');
      return [];
    }
    return value as unknown[];
  }
}
