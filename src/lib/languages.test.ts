import { describe, expect, it } from "vitest";

import {
  CODE_LANGUAGES,
  PLAIN_TEXT_OPTION,
  fromLanguageSelectValue,
  getLanguageOptions,
  toLanguageSelectValue,
} from "@/lib/languages";

describe("CODE_LANGUAGES", () => {
  it("has unique lowercase values", () => {
    const values = CODE_LANGUAGES.map((option) => option.value);

    expect(new Set(values).size).toBe(values.length);
    for (const value of values) {
      expect(value).toBe(value.trim().toLowerCase());
    }
  });

  it("includes the languages the seed data uses", () => {
    const values = CODE_LANGUAGES.map((option) => option.value);

    expect(values).toEqual(expect.arrayContaining(["bash", "dockerfile", "typescript"]));
  });
});

describe("getLanguageOptions", () => {
  it("starts with Plain text, then the list, for a blank language", () => {
    expect(getLanguageOptions("")).toEqual([PLAIN_TEXT_OPTION, ...CODE_LANGUAGES]);
  });

  it("adds nothing for a listed language, whatever its case", () => {
    expect(getLanguageOptions("TypeScript")).toEqual([
      PLAIN_TEXT_OPTION,
      ...CODE_LANGUAGES,
    ]);
  });

  it("keeps an unlisted stored language as an option under its own name", () => {
    const options = getLanguageOptions(" curl ");

    expect(options[1]).toEqual({ value: "curl", label: "curl" });
    expect(options).toHaveLength(CODE_LANGUAGES.length + 2);
  });
});

describe("toLanguageSelectValue", () => {
  it("maps blank and whitespace to the Plain text option", () => {
    expect(toLanguageSelectValue("")).toBe(PLAIN_TEXT_OPTION.value);
    expect(toLanguageSelectValue("   ")).toBe(PLAIN_TEXT_OPTION.value);
  });

  it("selects the listed option case-insensitively", () => {
    expect(toLanguageSelectValue("  TypeScript ")).toBe("typescript");
  });

  it("selects an unlisted language as itself, trimmed", () => {
    expect(toLanguageSelectValue(" curl ")).toBe("curl");
  });

  it("always selects a value that is among the options", () => {
    for (const language of ["", "Bash", "curl", "yaml"]) {
      const values = getLanguageOptions(language).map((option) => option.value);

      expect(values).toContain(toLanguageSelectValue(language));
    }
  });
});

describe("fromLanguageSelectValue", () => {
  it("turns Plain text back into a blank value", () => {
    expect(fromLanguageSelectValue(PLAIN_TEXT_OPTION.value)).toBe("");
  });

  it("passes any other value through", () => {
    expect(fromLanguageSelectValue("python")).toBe("python");
  });
});
