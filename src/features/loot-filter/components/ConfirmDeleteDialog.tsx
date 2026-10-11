import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ConfirmDeleteDialogProps {
  readonly name: string | null;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  /** Default "Delete filter?". */
  readonly title?: string;
  /** Default: the library entry text ("removed from this browser…"). */
  readonly description?: React.ReactNode;
}

/** Asks before deleting something (a library entry by default); open while `name` is set. */
export function ConfirmDeleteDialog({ name, onCancel, onConfirm, title = 'Delete filter?', description }: ConfirmDeleteDialogProps) {
  return (
    <Dialog
      open={name !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ??
              `“${name ?? ''}” is removed from this browser. Download it first if you want to keep a copy; this cannot be undone.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
