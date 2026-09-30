"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fromLanguageSelectValue,
  getLanguageOptions,
  toLanguageSelectValue,
} from "@/lib/languages";

interface LanguageSelectProps {
  id: string;
  /** The form's language value; blank means plain text. */
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}

/**
 * The item forms' language dropdown. The code editor below it reads the same
 * form value, so picking a language re-highlights the content straight away.
 */
export function LanguageSelect({
  id,
  value,
  onChange,
  invalid = false,
}: LanguageSelectProps) {
  return (
    <Select
      value={toLanguageSelectValue(value)}
      onValueChange={(next) => onChange(fromLanguageSelectValue(next))}
    >
      <SelectTrigger id={id} aria-invalid={invalid} className="w-full sm:w-48">
        <SelectValue />
      </SelectTrigger>
      {/* Popper, not item-aligned: aligned to the chosen item, a list this long
          would cover the field it belongs to. */}
      <SelectContent position="popper" className="max-h-72">
        {getLanguageOptions(value).map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
