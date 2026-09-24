/**
 * Picks the icon for a file item from its extension, for the Files list.
 *
 * Returns a lucide icon name rather than a component, like `ItemType.icon`, so
 * it resolves through `getIcon` in `src/lib/icons.ts` and this module stays
 * free of React.
 */

import { getFileExtension } from "@/lib/uploads";

/** The fallback for a missing or unrecognised extension. */
export const DEFAULT_FILE_ICON = "File";

const ICON_BY_EXTENSION: Record<string, string> = {
  pdf: "FileText",
  txt: "FileText",
  md: "FileText",
  json: "FileBraces",
  xml: "FileCode",
  csv: "FileSpreadsheet",
  yaml: "FileCog",
  yml: "FileCog",
  toml: "FileCog",
  ini: "FileCog",
};

/** The lucide icon name for a file, by extension. */
export function getFileIconName(fileName: string | null): string {
  const extension = fileName === null ? null : getFileExtension(fileName);

  return (extension !== null && ICON_BY_EXTENSION[extension]) || DEFAULT_FILE_ICON;
}
