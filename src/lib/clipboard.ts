import { toast } from "sonner";

/** Writes `text` to the clipboard and reports the outcome in a toast. */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  } catch {
    toast.error("Couldn't copy to clipboard");
  }
}
