import type { ItemTypeFields } from "@/lib/item-fields";
import { parseTagInput, type UpdateItemInput } from "@/lib/validations/items";
import type { ItemDetail } from "@/types";

/**
 * The raw input values of the item forms (New Item and the drawer's edit mode).
 * Tags stay one comma-separated string until submit.
 */
export interface ItemFormValues {
  title: string;
  description: string;
  content: string;
  language: string;
  url: string;
  tags: string;
}

export const EMPTY_ITEM_FORM_VALUES: ItemFormValues = {
  title: "",
  description: "",
  content: "",
  language: "",
  url: "",
  tags: "",
};

/** An existing item as edit-mode starting values; nulls become empty inputs. */
export function itemToFormValues(item: ItemDetail): ItemFormValues {
  return {
    title: item.title,
    description: item.description ?? "",
    content: item.content ?? "",
    language: item.language ?? "",
    url: item.url ?? "",
    tags: item.tags.join(", "),
  };
}

/**
 * The fields both item forms send. Only those shown for the type are
 * included: on edit an absent field is left alone by the server, so a hidden
 * field can never clear a column, and on create a value typed under another
 * type and left behind cannot fail validation for a field that is not on
 * screen. The collection ids are held apart from these text values and added
 * by each form.
 */
export function toItemFieldsPayload(
  values: ItemFormValues,
  fields: ItemTypeFields,
): Omit<UpdateItemInput, "collectionIds"> {
  return {
    title: values.title,
    description: values.description,
    tags: parseTagInput(values.tags),
    ...(fields.content ? { content: values.content } : {}),
    ...(fields.language ? { language: values.language } : {}),
    ...(fields.url ? { url: values.url } : {}),
  };
}
