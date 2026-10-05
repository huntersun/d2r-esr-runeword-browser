import { db } from '@/core/db';
import { useAvailableItemTypes as useRecipeItemTypes } from '@/core/hooks/useAvailableItemTypes';

export function useAvailableItemTypes(): readonly string[] | undefined {
  return useRecipeItemTypes(db.gemwords);
}
