import type { BuildData, CraftAnnotation, EquipmentSlot, ItemRef, WeaponSwapSlot } from '../buildData';
import type { CharacterClass } from '../constants';

export interface BuildFormValues {
  readonly name: string;
  readonly description: string;
  readonly characterClass: CharacterClass | '';
  readonly items: Partial<Record<EquipmentSlot, ItemRef | null>>;
  readonly weaponSwap: Partial<Record<WeaponSwapSlot, ItemRef | null>>;
  readonly mercenary: Partial<Record<EquipmentSlot, ItemRef | null>>;
  readonly itemNotes: Partial<Record<EquipmentSlot, string>>;
  readonly weaponSwapNotes: Partial<Record<WeaponSwapSlot, string>>;
  readonly mercenaryNotes: Partial<Record<EquipmentSlot, string>>;
  readonly itemCrafts: Partial<Record<EquipmentSlot, readonly CraftAnnotation[]>>;
  readonly weaponSwapCrafts: Partial<Record<WeaponSwapSlot, readonly CraftAnnotation[]>>;
  readonly mercenaryCrafts: Partial<Record<EquipmentSlot, readonly CraftAnnotation[]>>;
  readonly charms: readonly string[];
  readonly ascendancy: string | null;
  readonly skills: string;
}

export const EMPTY_BUILD_FORM: BuildFormValues = {
  name: '',
  description: '',
  characterClass: '',
  items: {},
  weaponSwap: {},
  mercenary: {},
  itemNotes: {},
  weaponSwapNotes: {},
  mercenaryNotes: {},
  itemCrafts: {},
  weaponSwapCrafts: {},
  mercenaryCrafts: {},
  charms: [],
  ascendancy: null,
  skills: '',
};

export interface BuildFormSubmit {
  readonly name: string;
  readonly description: string;
  readonly characterClass: CharacterClass;
  readonly buildData: BuildData;
}
