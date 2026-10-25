import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { FilterGroup, FilterGroupHeader, FilterGroupList } from '@/components/FilterGroup';
import {
  toggleGroup,
  selectAllCategories,
  deselectAllCategories,
  selectSelectedCategoriesRaw,
  selectIsAllCategoriesSelected,
} from '../store';
import { useCategoryFilters, getAllCategoriesFromGroups } from '../hooks';
import type { HtmFilterGroup } from '../types';
import { NO_CATEGORIES_MARKER } from '@/core/constants/categoryFilter';

type GroupState = 'all' | 'some' | 'none';

function getGroupState(groupCategories: readonly string[], selectedSet: ReadonlySet<string>, isAllSelected: boolean): GroupState {
  if (isAllSelected) {
    return 'all';
  }

  const selectedCount = groupCategories.filter((cat) => selectedSet.has(cat)).length;

  if (selectedCount === 0) return 'none';
  if (selectedCount === groupCategories.length) return 'all';
  return 'some';
}

interface CategoryGroupSectionProps {
  readonly group: HtmFilterGroup;
  readonly allCategories: readonly string[];
}

function CategoryGroupSection({ group, allCategories }: CategoryGroupSectionProps) {
  const dispatch = useDispatch();
  const selectedCategories = useSelector(selectSelectedCategoriesRaw);
  const isAllSelected = useSelector(selectIsAllCategoriesSelected);

  const selectedSet = new Set(selectedCategories);
  const groupState = getGroupState(group.categories, selectedSet, isAllSelected);

  const handleGroupToggle = () => {
    const newSelected = groupState !== 'all';
    dispatch(
      toggleGroup({
        groupCategories: group.categories,
        selected: newSelected,
        allCategories,
      })
    );
  };

  const isCategorySelected = (category: string) => {
    if (isAllSelected) return true;
    return selectedSet.has(category);
  };

  const handleCategoryToggle = (category: string) => {
    const isCurrentlySelected = isCategorySelected(category);
    dispatch(
      toggleGroup({
        groupCategories: [category],
        selected: !isCurrentlySelected,
        allCategories,
      })
    );
  };

  return (
    <FilterGroup
      label={group.label}
      checked={groupState === 'all' ? true : groupState === 'some' ? 'indeterminate' : false}
      onToggleGroup={handleGroupToggle}
      options={group.categories.map((category) => ({ id: category, label: category, checked: isCategorySelected(category) }))}
      onToggle={handleCategoryToggle}
    />
  );
}

export function HtmCategoryFilter() {
  const dispatch = useDispatch();
  const filterGroups = useCategoryFilters();
  const isAllSelected = useSelector(selectIsAllCategoriesSelected);
  const selectedCategories = useSelector(selectSelectedCategoriesRaw);

  if (!filterGroups) {
    return <div className="text-sm text-muted-foreground">Loading filters...</div>;
  }

  const allCategories = getAllCategoriesFromGroups(filterGroups);
  const noneSelected = selectedCategories.includes(NO_CATEGORIES_MARKER);

  return (
    <div className="space-y-2">
      <FilterGroupHeader label="Categories">
        <Button variant="outline" size="sm" onClick={() => dispatch(selectAllCategories())} disabled={isAllSelected}>
          All
        </Button>
        <Button variant="outline" size="sm" onClick={() => dispatch(deselectAllCategories())} disabled={noneSelected}>
          None
        </Button>
      </FilterGroupHeader>
      <FilterGroupList>
        {filterGroups.map((group) => (
          <CategoryGroupSection key={group.id} group={group} allCategories={allCategories} />
        ))}
      </FilterGroupList>
    </div>
  );
}
