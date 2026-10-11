import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface NameDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description?: string;
  readonly initialName: string;
  readonly submitLabel: string;
  readonly onSubmit: (name: string) => void;
}

/** A one-field dialog for naming a filter (new filter, rename). Rendered only while open, so it starts from `initialName`. */
export function NameDialog({ open, onOpenChange, ...props }: NameDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && (
          <NameForm
            {...props}
            onCancel={() => {
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface NameFormProps extends Omit<NameDialogProps, 'open' | 'onOpenChange'> {
  readonly onCancel: () => void;
}

function NameForm({ title, description, initialName, submitLabel, onSubmit, onCancel }: NameFormProps) {
  const [name, setName] = useState(initialName);
  const trimmed = name.trim();

  const handleSubmit = (event: React.SyntheticEvent) => {
    event.preventDefault();
    if (trimmed === '') return;
    onSubmit(trimmed);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description !== undefined && <DialogDescription>{description}</DialogDescription>}
      </DialogHeader>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="loot-filter-name">Name</Label>
          <Input
            id="loot-filter-name"
            value={name}
            autoComplete="off"
            autoFocus
            onChange={(event) => {
              setName(event.target.value);
            }}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={trimmed === ''}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
