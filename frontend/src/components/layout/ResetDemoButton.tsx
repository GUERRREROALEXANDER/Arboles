import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { useResetDemo } from "../../api/queries";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";

export function ResetDemoButton() {
  const [confirming, setConfirming] = useState(false);
  const reset = useResetDemo();

  return (
    <>
      <Button
        variant="ghost"
        size="md"
        icon={<RotateCcw className="size-4" aria-hidden />}
        onClick={() => setConfirming(true)}
      >
        <span className="hidden xl:inline">Reset demo data</span>
        <span className="sr-only xl:hidden">Reset demo data</span>
      </Button>
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Reset demo data"
        description="Reloads the bundled Bogota dataset. Every specimen, measurement and work order you changed returns to its original state."
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={reset.isPending}
            onClick={() => reset.mutate(undefined, { onSuccess: () => setConfirming(false) })}
          >
            Reset data
          </Button>
        </div>
      </Dialog>
    </>
  );
}
