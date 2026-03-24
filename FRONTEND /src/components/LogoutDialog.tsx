import { Power } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface LogoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LogoutDialog = ({ open, onOpenChange }: LogoutDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border text-center">
        <DialogHeader className="items-center">
          <div className="w-14 h-14 rounded-xl border border-border bg-secondary flex items-center justify-center mb-2 mx-auto">
            <Power className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="font-display text-2xl text-foreground">
            Disconnecting?
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm max-w-xs mx-auto">
            Your session will be securely terminated. All unsaved observatory configurations will be stored in your local vault.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-2">
          <button
            onClick={() => onOpenChange(false)}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Log Out
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="text-foreground font-display font-semibold text-sm hover:text-primary transition-colors"
          >
            Stay Connected
          </button>
        </div>

        <p className="text-muted-foreground text-[10px] tracking-[0.2em] mt-2">
          ● SECURE VAULT PROTOCOL 2.4 ●
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default LogoutDialog;
