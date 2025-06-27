// components/DeleteConfirmationModal.tsx

import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  loading?: boolean
}

export default function DeleteConfirmationModal({ open, onClose, onConfirm, loading }: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">Delete Account?</DialogTitle>
          <p className="text-muted-foreground text-sm">
            This action is irreversible. Your data and account will be permanently deleted.
          </p>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? "Deleting..." : "Yes, Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
