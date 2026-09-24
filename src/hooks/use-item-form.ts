"use client";

import { useState, type ChangeEvent } from "react";

import type { CreateItemField, UpdateItemField } from "@/actions/items";
import type { ItemFormValues } from "@/lib/item-form";

export type ItemFormIssues = Partial<Record<CreateItemField | UpdateItemField, string[]>>;

/**
 * Values and server-side messages for an item form, plus `bind`, which wires
 * an `Input` or `Textarea` to one value with a matching id and `aria-invalid`.
 * `idPrefix` keeps the ids unique when both forms could be on the page.
 */
export function useItemForm(
  idPrefix: string,
  initialValues: ItemFormValues | (() => ItemFormValues),
) {
  const [values, setValues] = useState(initialValues);
  const [issues, setIssues] = useState<ItemFormIssues>({});

  function idFor(name: keyof ItemFormValues) {
    return `${idPrefix}-${name}`;
  }

  function setValue(name: keyof ItemFormValues, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function bind(name: keyof ItemFormValues) {
    return {
      id: idFor(name),
      name,
      value: values[name],
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setValue(name, event.target.value),
      "aria-invalid": Boolean(issues[name]),
    };
  }

  return { values, setValue, issues, setIssues, idFor, bind };
}

export type ItemForm = ReturnType<typeof useItemForm>;
