import { File } from "lucide-react";
import { describe, expect, it } from "vitest";

import { DEFAULT_FILE_ICON, getFileIconName } from "@/lib/file-icons";
import { getIcon } from "@/lib/icons";
import { UPLOAD_RULES } from "@/lib/uploads";

describe("getFileIconName", () => {
  it.each([
    ["report.pdf", "FileText"],
    ["notes.txt", "FileText"],
    ["README.md", "FileText"],
    ["package.json", "FileBraces"],
    ["pom.xml", "FileCode"],
    ["export.csv", "FileSpreadsheet"],
    ["compose.yaml", "FileCog"],
    ["ci.yml", "FileCog"],
    ["Cargo.toml", "FileCog"],
    ["php.ini", "FileCog"],
  ])("maps %s to %s", (fileName, icon) => {
    expect(getFileIconName(fileName)).toBe(icon);
  });

  it("ignores the extension's case", () => {
    expect(getFileIconName("REPORT.PDF")).toBe("FileText");
  });

  it("uses the last extension", () => {
    expect(getFileIconName("backup.tar.json")).toBe("FileBraces");
  });

  it.each([
    ["an unknown extension", "archive.zip"],
    ["no extension", "Makefile"],
    ["a dotfile", ".env"],
    ["a trailing dot", "notes."],
    ["no file name", null],
  ])("falls back to the default for %s", (_, fileName) => {
    expect(getFileIconName(fileName)).toBe(DEFAULT_FILE_ICON);
  });

  it("maps every uploadable file extension to a registered icon", () => {
    for (const extension of Object.keys(UPLOAD_RULES.file.extensions)) {
      const name = getFileIconName(`upload.${extension}`);

      expect(name, extension).not.toBe(DEFAULT_FILE_ICON);
      // `getIcon` falls back to `File` for a name missing from its map.
      expect(getIcon(name), name).not.toBe(File);
    }
  });
});
