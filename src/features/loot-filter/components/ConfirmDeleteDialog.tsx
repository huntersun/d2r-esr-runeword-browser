import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ConfirmDeleteDialogProps {
  readonly name: string | null;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

/** Asks before deleting a library entry; open while `name` is set. */
export function ConfirmDeleteDialog({ name, onCancel, onConfirm }: ConfirmDeleteDialogProps) {
  return (
    <Dialog
      open={name !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete filter?</DialogTitle>
          <DialogDescription>
            “{name}” is removed from this browser. Download it first if you want to keep a copy; this cannot be undone.
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
