import { registerSaga, runSagas } from '@/core/store';
import { lootFilterSaga } from './lootFilterSaga';

/**
 * Starts the library saga when the feature chunk loads (the registry never starts it twice). `runSagas` starts the
 * middleware runner if the data sync has not done so yet: `/loot-filters` does not wait for the HTM startup gate.
 */
export function registerLootFilterSaga(): void {
  registerSaga(lootFilterSaga);
  runSagas();
}
