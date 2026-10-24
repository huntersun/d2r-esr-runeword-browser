import { useDispatch, useSelector } from 'react-redux';
import { HelpCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { selectRuneMatchMode, setRuneMatchMode } from '../store/runewordsSlice';

/** "Any of these runes" toggle next to the rune checkboxes (`runemode=any`); unchecked = strict matching. */
export function RuneMatchModeToggle() {
  const dispatch = useDispatch();
  const mode = useSelector(selectRuneMatchMode);

  return (
    <div className="flex items-center gap-1 ml-2">
      <label className="flex items-center gap-1.5 cursor-pointer">
        <Checkbox
          checked={mode === 'any'}
          onCheckedChange={(checked) => {
            dispatch(setRuneMatchMode(checked === true ? 'any' : 'all'));
          }}
        />
        <span className="text-sm">Any of these runes</span>
      </label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="size-5 text-muted-foreground" aria-label="Rune filter help">
            <HelpCircle className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-2 text-sm text-muted-foreground">
            <h4 className="font-medium text-foreground">Rune matching</h4>
            <p>
              <strong>Off (default):</strong> shows runewords made <strong>only</strong> from checked runes. Uncheck the runes you do not
              have.
            </p>
            <p>
              <strong>Any of these runes:</strong> shows runewords that contain <strong>at least one</strong> checked rune. Click{' '}
              <em>None</em>, check Ber, and you get every word that uses Ber.
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
