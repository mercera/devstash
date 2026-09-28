import type { SVGProps } from "react";

/**
 * Third-party marks, inlined. lucide-react dropped its brand icons in v1, so
 * there is nothing to import. GitHub is its real mark and follows
 * `currentColor`; Notion, Slack and VS Code are simplified drawings in their
 * own colors, for the homepage only.
 */

type IconProps = SVGProps<SVGSVGElement>;

export function GitHubIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

export function NotionIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="3" fill="#fff" stroke="#111" strokeWidth="1.5" />
      <path
        d="M8.5 16.5v-9l7 9v-9"
        fill="none"
        stroke="#111"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SlackIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect x="9.5" y="2" width="3.5" height="9" rx="1.75" fill="#36c5f0" />
      <rect x="13" y="9.5" width="9" height="3.5" rx="1.75" fill="#2eb67d" />
      <rect x="11" y="13" width="3.5" height="9" rx="1.75" fill="#ecb22e" />
      <rect x="2" y="11" width="9" height="3.5" rx="1.75" fill="#e01e5a" />
    </svg>
  );
}

export function VSCodeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M17 2.5 22 5v14l-5 2.5L7.5 13 3.5 16 2 15V9l1.5-1 4 3Z" fill="#1f8ad2" />
      <path d="M17 2.5v19L7.5 13 17 2.5Z" fill="#35a4f0" />
      <path d="M17 7.5 11 12l6 4.5Z" fill="#0f5d99" />
    </svg>
  );
}
