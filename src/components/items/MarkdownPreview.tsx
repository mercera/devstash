import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Open every link in a new tab, like the drawer's URL link. A link whose URL
 * react-markdown stripped as unsafe (`javascript:` and the like) arrives with
 * an empty `href`, and renders as its text.
 */
const MARKDOWN_COMPONENTS: Components = {
  a: ({ href, title, children }) =>
    href ? (
      <a href={href} title={title} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ) : (
      <span>{children}</span>
    ),
};

/**
 * Markdown rendered with the app's `.markdown-preview` styles: a note's
 * preview, or an AI explanation.
 *
 * Rendering goes through `react-markdown`, which escapes raw HTML and drops
 * `javascript:` URLs by default. Keep it that way: no `rehype-raw`.
 */
export function MarkdownPreview({ value }: { value: string }) {
  return (
    <div className="markdown-preview">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
        {value}
      </ReactMarkdown>
    </div>
  );
}
