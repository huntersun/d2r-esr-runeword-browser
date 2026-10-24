import { useDispatch, useSelector } from 'react-redux';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { selectAcquisition, setAcquisition } from '../store';
import { ACQUISITION_OPTIONS } from '../utils/acquisition';

/** Single-select "Acquisition" chips (replaces the old "Include Coupon Items" checkbox). */
export function AcquisitionFilter() {
  const dispatch = useDispatch();
  const acquisition = useSelector(selectAcquisition);

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Acquisition">
      <span className="font-medium text-sm">Acquisition:</span>
      {ACQUISITION_OPTIONS.map((option) => (
        <Button
          key={option.value}
          size="sm"
          variant={acquisition === option.value ? 'default' : 'outline'}
          aria-pressed={acquisition === option.value}
          title={option.description}
          onClick={() => dispatch(setAcquisition(option.value))}
        >
          {option.label}
        </Button>
      ))}
      <AcquisitionHelpButton />
    </div>
  );
}

function AcquisitionHelpButton() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="size-5 text-muted-foreground" aria-label="Acquisition help">
          <HelpCircle className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-2">
          <h4 className="font-medium">How the item is obtained</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            {ACQUISITION_OPTIONS.map((option) => (
              <li key={option.value}>
                <strong>{option.label}</strong> - {option.description}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Based on the "Ancient Coupon Unique" and "Gamble Item" lines of the ESR unique pages.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
