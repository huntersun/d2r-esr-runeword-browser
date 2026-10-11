import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ConfirmRuleDeleteDialogProps {
  /** The rule to delete (0-based), or null when closed. */
  readonly index: number | null;
  readonly summary: string;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

/** Asks before deleting a rule (there is no undo). */
export function ConfirmRuleDeleteDialog({ index, summary, onCancel, onConfirm }: ConfirmRuleDeleteDialogProps) {
  return (
    <Dialog
      open={index !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete rule {index === null ? '' : index + 1}?</DialogTitle>
          <DialogDescription className="break-words">{summary}</DialogDescription>
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
