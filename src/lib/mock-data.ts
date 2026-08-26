/**
 * Mock data — the single source of truth for the UI until the database exists.
 *
 * Everything the dashboard renders is derived from the arrays below, so counts
 * always match the actual items. Swap the exported getters for Prisma queries
 * when the real data layer lands; the return shapes are already correct.
 */

import type {
  Collection,
  CollectionWithCount,
  Item,
  ItemType,
  ItemTypeWithCount,
  ItemWithRelations,
  User,
} from "@/types";

const date = (iso: string) => new Date(iso);

// -----------------------------------------------------------------------------
// Current user
// -----------------------------------------------------------------------------

export const currentUser: User = {
  id: "user_1",
  name: "John Doe",
  email: "john@example.com",
  image: null,
  isPro: true,
  createdAt: date("2026-01-04"),
};

// -----------------------------------------------------------------------------
// Item types
// -----------------------------------------------------------------------------

export const itemTypes: ItemType[] = [
  {
    id: "type_snippet",
    name: "Snippets",
    slug: "snippet",
    icon: "Code2",
    color: "blue",
    isSystem: true,
  },
  {
    id: "type_prompt",
    name: "Prompts",
    slug: "prompt",
    icon: "Sparkles",
    color: "purple",
    isSystem: true,
  },
  {
    id: "type_command",
    name: "Commands",
    slug: "command",
    icon: "Terminal",
    color: "orange",
    isSystem: true,
  },
  {
    id: "type_note",
    name: "Notes",
    slug: "note",
    icon: "FileText",
    color: "yellow",
    isSystem: true,
  },
  {
    id: "type_file",
    name: "Files",
    slug: "file",
    icon: "File",
    color: "gray",
    isSystem: true,
  },
  {
    id: "type_image",
    name: "Images",
    slug: "image",
    icon: "Image",
    color: "pink",
    isSystem: true,
  },
  {
    id: "type_link",
    name: "Links",
    slug: "link",
    icon: "Link",
    color: "green",
    isSystem: true,
  },
];

// -----------------------------------------------------------------------------
// Collections
// -----------------------------------------------------------------------------

export const collections: Collection[] = [
  {
    id: "col_react",
    name: "React Patterns",
    slug: "react-patterns",
    description: "Common React patterns and hooks",
    color: "blue",
    isFavorite: true,
    createdAt: date("2026-01-06"),
    updatedAt: date("2026-08-18"),
  },
  {
    id: "col_python",
    name: "Python Snippets",
    slug: "python-snippets",
    description: "Useful Python code snippets",
    color: "blue",
    isFavorite: false,
    createdAt: date("2026-01-09"),
    updatedAt: date("2026-08-11"),
  },
  {
    id: "col_context",
    name: "Context Files",
    slug: "context-files",
    description: "AI context files for projects",
    color: "gray",
    isFavorite: true,
    createdAt: date("2026-02-02"),
    updatedAt: date("2026-08-20"),
  },
  {
    id: "col_interview",
    name: "Interview Prep",
    slug: "interview-prep",
    description: "Technical interview preparation",
    color: "yellow",
    isFavorite: false,
    createdAt: date("2026-02-14"),
    updatedAt: date("2026-08-05"),
  },
  {
    id: "col_git",
    name: "Git Commands",
    slug: "git-commands",
    description: "Frequently used git commands",
    color: "orange",
    isFavorite: true,
    createdAt: date("2026-03-01"),
    updatedAt: date("2026-08-21"),
  },
  {
    id: "col_ai",
    name: "AI Prompts",
    slug: "ai-prompts",
    description: "Curated AI prompts for coding",
    color: "purple",
    isFavorite: false,
    createdAt: date("2026-03-18"),
    updatedAt: date("2026-08-22"),
  },
];

// -----------------------------------------------------------------------------
// Items
// -----------------------------------------------------------------------------

export const items: Item[] = [
  {
    id: "item_use_auth",
    title: "useAuth Hook",
    description: "Custom authentication hook for React applications",
    contentType: "text",
    content: `export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  return { user, loading, isAuthenticated: !!user };
}`,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    url: null,
    language: "typescript",
    isFavorite: true,
    isPinned: true,
    typeId: "type_snippet",
    collectionId: "col_react",
    tags: ["react", "auth", "hooks"],
    createdAt: date("2026-01-15"),
    updatedAt: date("2026-08-18"),
  },
  {
    id: "item_api_errors",
    title: "API Error Handling Pattern",
    description: "Fetch wrapper with exponential backoff retry logic",
    contentType: "text",
    content: `export async function fetchWithRetry(url: string, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.json();
      throw new Error(\`HTTP \${res.status}\`);
    } catch (error) {
      if (attempt === retries - 1) throw error;
      await new Promise((r) => setTimeout(r, 2 ** attempt * 1000));
    }
  }
}`,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    url: null,
    language: "typescript",
    isFavorite: false,
    isPinned: true,
    typeId: "type_snippet",
    collectionId: "col_react",
    tags: ["api", "error-handling", "fetch"],
    createdAt: date("2026-01-12"),
    updatedAt: date("2026-07-30"),
  },
  {
    id: "item_debounce",
    title: "useDebounce Hook",
    description: "Debounce any fast-changing value",
    contentType: "text",
    content: `export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}`,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    url: null,
    language: "typescript",
    isFavorite: true,
    isPinned: false,
    typeId: "type_snippet",
    collectionId: "col_react",
    tags: ["react", "hooks", "performance"],
    createdAt: date("2026-02-03"),
    updatedAt: date("2026-08-14"),
  },
  {
    id: "item_py_chunk",
    title: "Chunk a List",
    description: "Split any iterable into fixed-size batches",
    contentType: "text",
    content: `def chunk(items, size):
    for i in range(0, len(items), size):
        yield items[i : i + size]`,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    url: null,
    language: "python",
    isFavorite: false,
    isPinned: false,
    typeId: "type_snippet",
    collectionId: "col_python",
    tags: ["python", "utils"],
    createdAt: date("2026-02-20"),
    updatedAt: date("2026-06-02"),
  },
  {
    id: "item_code_review_prompt",
    title: "Code Review Prompt",
    description: "Thorough review prompt covering security and edge cases",
    contentType: "text",
    content: `Review the following code as a senior engineer.

Focus on, in priority order:
1. Security issues (auth checks, input validation, injection)
2. Correctness and edge cases
3. Performance (N+1 queries, unnecessary re-renders)
4. Consistency with surrounding patterns

For each finding give the file, the line, and a concrete fix.
Skip nitpicks that a formatter would catch.`,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    url: null,
    language: null,
    isFavorite: true,
    isPinned: false,
    typeId: "type_prompt",
    collectionId: "col_ai",
    tags: ["ai", "review", "quality"],
    createdAt: date("2026-03-19"),
    updatedAt: date("2026-08-22"),
  },
  {
    id: "item_commit_prompt",
    title: "Commit Message Generator",
    description: "Turns a diff into a conventional commit message",
    contentType: "text",
    content: `Write a conventional commit message for the diff below.

Rules:
- One line summary, imperative mood, under 72 characters
- Use the correct type prefix (feat, fix, chore, docs, refactor)
- Add a body only when the "why" is not obvious from the summary`,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    url: null,
    language: null,
    isFavorite: false,
    isPinned: false,
    typeId: "type_prompt",
    collectionId: "col_ai",
    tags: ["ai", "git", "workflow"],
    createdAt: date("2026-04-02"),
    updatedAt: date("2026-07-19"),
  },
  {
    id: "item_git_undo",
    title: "Undo Last Commit (Keep Changes)",
    description: "Reset the last commit but leave the working tree intact",
    contentType: "text",
    content: "git reset --soft HEAD~1",
    fileUrl: null,
    fileName: null,
    fileSize: null,
    url: null,
    language: "bash",
    isFavorite: true,
    isPinned: true,
    typeId: "type_command",
    collectionId: "col_git",
    tags: ["git", "undo"],
    createdAt: date("2026-03-04"),
    updatedAt: date("2026-08-21"),
  },
  {
    id: "item_git_prune",
    title: "Prune Merged Branches",
    description: "Delete every local branch already merged into main",
    contentType: "text",
    content:
      "git branch --merged main | grep -v '^\\*\\|main' | xargs -n 1 git branch -d",
    fileUrl: null,
    fileName: null,
    fileSize: null,
    url: null,
    language: "bash",
    isFavorite: false,
    isPinned: false,
    typeId: "type_command",
    collectionId: "col_git",
    tags: ["git", "cleanup"],
    createdAt: date("2026-03-11"),
    updatedAt: date("2026-05-27"),
  },
  {
    id: "item_docker_prune",
    title: "Reclaim Docker Disk Space",
    description: "Remove unused containers, images and volumes",
    contentType: "text",
    content: "docker system prune -a --volumes",
    fileUrl: null,
    fileName: null,
    fileSize: null,
    url: null,
    language: "bash",
    isFavorite: false,
    isPinned: false,
    typeId: "type_command",
    collectionId: null,
    tags: ["docker", "cleanup"],
    createdAt: date("2026-04-22"),
    updatedAt: date("2026-04-22"),
  },
  {
    id: "item_bigo_note",
    title: "Big-O Cheat Sheet",
    description: "Time and space complexity for common operations",
    contentType: "text",
    content: `## Arrays
- Access: O(1)
- Search: O(n)
- Insert / delete at end: O(1) amortized
- Insert / delete at start: O(n)

## Hash Maps
- Insert / lookup / delete: O(1) average, O(n) worst

## Sorting
- Merge sort: O(n log n) time, O(n) space
- Quick sort: O(n log n) average, O(n^2) worst`,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    url: null,
    language: null,
    isFavorite: true,
    isPinned: false,
    typeId: "type_note",
    collectionId: "col_interview",
    tags: ["algorithms", "interview"],
    createdAt: date("2026-02-16"),
    updatedAt: date("2026-08-05"),
  },
  {
    id: "item_system_design_note",
    title: "System Design Interview Checklist",
    description: "Structure for the 45-minute design round",
    contentType: "text",
    content: `1. Clarify requirements and scale (5 min)
2. Define the API surface (5 min)
3. Sketch the high-level architecture (10 min)
4. Design the data model (10 min)
5. Deep dive on one bottleneck (10 min)
6. Discuss trade-offs and failure modes (5 min)`,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    url: null,
    language: null,
    isFavorite: false,
    isPinned: false,
    typeId: "type_note",
    collectionId: "col_interview",
    tags: ["interview", "system-design"],
    createdAt: date("2026-02-18"),
    updatedAt: date("2026-07-08"),
  },
  {
    id: "item_claude_md",
    title: "CLAUDE.md Template",
    description: "Starter context file for new Claude Code projects",
    contentType: "file",
    content: null,
    fileUrl: "/mock/claude-md-template.md",
    fileName: "CLAUDE.md",
    fileSize: 4_820,
    url: null,
    language: null,
    isFavorite: true,
    isPinned: false,
    typeId: "type_file",
    collectionId: "col_context",
    tags: ["ai", "context", "template"],
    createdAt: date("2026-02-04"),
    updatedAt: date("2026-08-20"),
  },
  {
    id: "item_coding_standards",
    title: "Coding Standards Context",
    description: "Shared TypeScript and React conventions",
    contentType: "file",
    content: null,
    fileUrl: "/mock/coding-standards.md",
    fileName: "coding-standards.md",
    fileSize: 2_140,
    url: null,
    language: null,
    isFavorite: false,
    isPinned: false,
    typeId: "type_file",
    collectionId: "col_context",
    tags: ["context", "standards"],
    createdAt: date("2026-02-06"),
    updatedAt: date("2026-06-15"),
  },
  {
    id: "item_arch_diagram",
    title: "Auth Flow Diagram",
    description: "NextAuth session lifecycle, exported from Excalidraw",
    contentType: "file",
    content: null,
    fileUrl: "/mock/auth-flow.png",
    fileName: "auth-flow.png",
    fileSize: 186_400,
    url: null,
    language: null,
    isFavorite: false,
    isPinned: false,
    typeId: "type_image",
    collectionId: "col_context",
    tags: ["auth", "diagram"],
    createdAt: date("2026-05-09"),
    updatedAt: date("2026-05-09"),
  },
  {
    id: "item_prisma_docs",
    title: "Prisma Relation Queries",
    description: "Official docs for nested reads and writes",
    contentType: "text",
    content: null,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    url: "https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries",
    language: null,
    isFavorite: false,
    isPinned: false,
    typeId: "type_link",
    collectionId: null,
    tags: ["prisma", "docs", "database"],
    createdAt: date("2026-06-01"),
    updatedAt: date("2026-06-01"),
  },
  {
    id: "item_tailwind_v4",
    title: "Tailwind CSS v4 Theme Variables",
    description: "How the @theme directive replaces the JS config",
    contentType: "text",
    content: null,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    url: "https://tailwindcss.com/docs/theme",
    language: null,
    isFavorite: true,
    isPinned: false,
    typeId: "type_link",
    collectionId: "col_react",
    tags: ["tailwind", "css", "docs"],
    createdAt: date("2026-06-24"),
    updatedAt: date("2026-08-12"),
  },
];

// -----------------------------------------------------------------------------
// Derived getters
//
// The dashboard reads through these rather than the raw arrays, so counts stay
// consistent and swapping in Prisma later is a one-file change.
// -----------------------------------------------------------------------------

export function getItemType(typeId: string): ItemType | undefined {
  return itemTypes.find((type) => type.id === typeId);
}

export function getCollection(collectionId: string): Collection | undefined {
  return collections.find((collection) => collection.id === collectionId);
}

/** Joins an item with its type and collection. */
export function withRelations(item: Item): ItemWithRelations {
  const type = getItemType(item.typeId);
  if (!type) throw new Error(`Unknown item type: ${item.typeId}`);

  return {
    ...item,
    type,
    collection: item.collectionId
      ? (getCollection(item.collectionId) ?? null)
      : null,
  };
}

/** Item types with their counts — the sidebar "Types" section. */
export function getItemTypesWithCounts(): ItemTypeWithCount[] {
  return itemTypes.map((type) => ({
    ...type,
    itemCount: items.filter((item) => item.typeId === type.id).length,
  }));
}

/** Collections with their counts and type icons — the dashboard cards. */
export function getCollectionsWithCounts(): CollectionWithCount[] {
  return collections.map((collection) => {
    const collectionItems = items.filter(
      (item) => item.collectionId === collection.id,
    );

    return {
      ...collection,
      itemCount: collectionItems.length,
      typeIds: [...new Set(collectionItems.map((item) => item.typeId))],
    };
  });
}

export function getFavoriteCollections(): CollectionWithCount[] {
  return getCollectionsWithCounts().filter((collection) => collection.isFavorite);
}

/** Collections, most recently updated first — the sidebar and dashboard lists. */
export function getRecentCollections(limit?: number): CollectionWithCount[] {
  const recent = getCollectionsWithCounts().sort(byUpdatedAtDesc);
  return limit ? recent.slice(0, limit) : recent;
}

/** Pinned items, newest first — the dashboard "Pinned" section. */
export function getPinnedItems(): ItemWithRelations[] {
  return items
    .filter((item) => item.isPinned)
    .sort(byUpdatedAtDesc)
    .map(withRelations);
}

export function getFavoriteItems(): ItemWithRelations[] {
  return items.filter((item) => item.isFavorite).sort(byUpdatedAtDesc).map(withRelations);
}

export function getRecentItems(limit = 6): ItemWithRelations[] {
  return [...items].sort(byUpdatedAtDesc).slice(0, limit).map(withRelations);
}

export function getItemsByType(typeSlug: string): ItemWithRelations[] {
  const type = itemTypes.find((candidate) => candidate.slug === typeSlug);
  if (!type) return [];

  return items
    .filter((item) => item.typeId === type.id)
    .sort(byUpdatedAtDesc)
    .map(withRelations);
}

export function getItemsByCollection(collectionSlug: string): ItemWithRelations[] {
  const collection = collections.find(
    (candidate) => candidate.slug === collectionSlug,
  );
  if (!collection) return [];

  return items
    .filter((item) => item.collectionId === collection.id)
    .sort(byUpdatedAtDesc)
    .map(withRelations);
}

export function getItem(itemId: string): ItemWithRelations | undefined {
  const item = items.find((candidate) => candidate.id === itemId);
  return item ? withRelations(item) : undefined;
}

/** Full-text search across titles, descriptions, content, tags and type names. */
export function searchItems(query: string): ItemWithRelations[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  return items
    .map(withRelations)
    .filter((item) =>
      [
        item.title,
        item.description ?? "",
        item.content ?? "",
        item.url ?? "",
        item.type.name,
        ...item.tags,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    )
    .sort(byUpdatedAtDesc);
}

/** Every distinct tag name, alphabetically. */
export function getAllTags(): string[] {
  return [...new Set(items.flatMap((item) => item.tags))].sort();
}

function byUpdatedAtDesc<T extends { updatedAt: Date }>(a: T, b: T): number {
  return b.updatedAt.getTime() - a.updatedAt.getTime();
}
