import { DASHBOARD_PATH, REGISTER_PATH } from "@/lib/routes";

export interface HomeLink {
  label: string;
  href: string;
}

/** In-page anchors shared by the nav and the footer. */
export const SECTION_LINKS: HomeLink[] = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
];

/** Placeholders point at `#` until their pages exist. */
export const FOOTER_COLUMNS: { title: string; links: HomeLink[] }[] = [
  {
    title: "Product",
    links: [...SECTION_LINKS, { label: "Changelog", href: "#" }],
  },
  {
    title: "Resources",
    links: [
      { label: "Docs", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Support", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
    ],
  },
];

/** A sign-up button for visitors, a way back in for signed-in users. */
export function getPrimaryCta(signedIn: boolean, signedOutLabel: string): HomeLink {
  return signedIn
    ? { label: "Go to Dashboard", href: DASHBOARD_PATH }
    : { label: signedOutLabel, href: REGISTER_PATH };
}

/** The hero and CTA buttons, a size up from the ShadCN `lg`. */
export const LARGE_BUTTON_CLASS = "h-11 px-5 text-base";
