/**
 * Database seed.
 *
 * Populates a demo user, the system item types, and a handful of collections
 * and items for local development and demos. Run with:
 *
 *   npm run db:seed
 *
 * Safe to re-run: every row is keyed by a stable id or a unique field and
 * upserted, so re-seeding updates existing rows instead of duplicating them.
 *
 * `dotenv/config` must be imported first — ESM evaluates imports in source
 * order, and `src/lib/prisma.ts` reads DATABASE_URL as it loads.
 */
import "dotenv/config";

import { randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";

import { prisma } from "../src/lib/prisma";
import type { AccentColor } from "../src/generated/prisma/enums";

const DEMO_USER_ID = "seed-user-demo";

const ITEM_TYPES = [
  {
    id: "seed-type-snippet",
    name: "Snippets",
    slug: "snippet",
    icon: "Code",
    color: "blue",
  },
  {
    id: "seed-type-prompt",
    name: "Prompts",
    slug: "prompt",
    icon: "Sparkles",
    color: "purple",
  },
  {
    id: "seed-type-command",
    name: "Commands",
    slug: "command",
    icon: "Terminal",
    color: "orange",
  },
  {
    id: "seed-type-note",
    name: "Notes",
    slug: "note",
    icon: "StickyNote",
    color: "yellow",
  },
  {
    id: "seed-type-file",
    name: "Files",
    slug: "file",
    icon: "File",
    color: "gray",
  },
  {
    id: "seed-type-image",
    name: "Images",
    slug: "image",
    icon: "Image",
    color: "pink",
  },
  {
    id: "seed-type-link",
    name: "Links",
    slug: "link",
    icon: "Link",
    color: "green",
  },
] satisfies { id: string; name: string; slug: string; icon: string; color: AccentColor }[];

const COLLECTIONS = [
  {
    id: "seed-col-react-patterns",
    name: "React Patterns",
    slug: "react-patterns",
    description: "Reusable React patterns and hooks",
    color: "blue",
    isFavorite: true,
  },
  {
    id: "seed-col-ai-workflows",
    name: "AI Workflows",
    slug: "ai-workflows",
    description: "AI prompts and workflow automations",
    color: "purple",
    isFavorite: true,
  },
  {
    id: "seed-col-devops",
    name: "DevOps",
    slug: "devops",
    description: "Infrastructure and deployment resources",
    color: "orange",
    isFavorite: false,
  },
  {
    id: "seed-col-terminal-commands",
    name: "Terminal Commands",
    slug: "terminal-commands",
    description: "Useful shell commands for everyday development",
    color: "gray",
    isFavorite: false,
  },
  {
    id: "seed-col-design-resources",
    name: "Design Resources",
    slug: "design-resources",
    description: "UI/UX resources and references",
    color: "pink",
    isFavorite: false,
  },
] satisfies {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: AccentColor;
  isFavorite: boolean;
}[];

type SeedItem = {
  id: string;
  title: string;
  description: string;
  typeSlug: (typeof ITEM_TYPES)[number]["slug"];
  collectionSlug: (typeof COLLECTIONS)[number]["slug"];
  content?: string;
  url?: string;
  language?: string;
  tags: string[];
  isFavorite?: boolean;
  isPinned?: boolean;
};

const ITEMS: SeedItem[] = [
  // React Patterns -----------------------------------------------------------
  {
    id: "seed-item-use-local-storage",
    title: "useLocalStorage Hook",
    description: "Persist React state to localStorage with an SSR-safe fallback",
    typeSlug: "snippet",
    collectionSlug: "react-patterns",
    language: "typescript",
    content: `export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}`,
    tags: ["react", "hooks", "storage"],
    isFavorite: true,
    isPinned: true,
  },
  {
    id: "seed-item-compound-component",
    title: "Compound Component Pattern",
    description: "Tabs built with context so subcomponents share state implicitly",
    typeSlug: "snippet",
    collectionSlug: "react-patterns",
    language: "typescript",
    content: `const TabsContext = createContext<{
  active: string;
  setActive: (id: string) => void;
} | null>(null);

export function Tabs({ defaultTab, children }: { defaultTab: string; children: ReactNode }) {
  const [active, setActive] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ active, setActive }}>{children}</TabsContext.Provider>
  );
}

Tabs.Tab = function Tab({ id, children }: { id: string; children: ReactNode }) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs.Tab must be used within Tabs");
  return (
    <button data-active={ctx.active === id} onClick={() => ctx.setActive(id)}>
      {children}
    </button>
  );
};`,
    tags: ["react", "patterns", "context"],
    isFavorite: true,
  },
  {
    id: "seed-item-group-by",
    title: "groupBy Utility",
    description: "Group an array of items by a derived key",
    typeSlug: "snippet",
    collectionSlug: "react-patterns",
    language: "typescript",
    content: `export function groupBy<T, K extends PropertyKey>(
  items: T[],
  keyFn: (item: T) => K,
): Record<K, T[]> {
  return items.reduce(
    (acc, item) => {
      const key = keyFn(item);
      (acc[key] ??= []).push(item);
      return acc;
    },
    {} as Record<K, T[]>,
  );
}`,
    tags: ["typescript", "utils"],
  },

  // AI Workflows ---------------------------------------------------------------
  {
    id: "seed-item-code-review-prompt",
    title: "Thorough Code Review",
    description: "Review prompt covering security, correctness and consistency",
    typeSlug: "prompt",
    collectionSlug: "ai-workflows",
    content: `Review the following code as a senior engineer.

Focus on, in priority order:
1. Security issues (auth checks, input validation, injection)
2. Correctness and edge cases
3. Performance (N+1 queries, unnecessary re-renders)
4. Consistency with surrounding patterns

For each finding, give the file, the line, and a concrete fix.
Skip nitpicks a formatter would catch.`,
    tags: ["ai", "review", "quality"],
    isPinned: true,
  },
  {
    id: "seed-item-doc-gen-prompt",
    title: "Generate Function Documentation",
    description: "Turns a function signature and body into a doc comment",
    typeSlug: "prompt",
    collectionSlug: "ai-workflows",
    content: `Write a documentation comment for the function below.

Rules:
- One-sentence summary of what it does, not how
- Document parameters and return value only if not obvious from the types
- Note thrown errors or side effects
- Skip the comment entirely if nothing here would surprise a reader`,
    tags: ["ai", "docs", "workflow"],
  },
  {
    id: "seed-item-refactor-prompt",
    title: "Refactor for Readability",
    description: "Suggests a minimal refactor without changing behavior",
    typeSlug: "prompt",
    collectionSlug: "ai-workflows",
    content: `Suggest a refactor for the code below that improves readability without
changing behavior.

Constraints:
- Preserve the public API and existing tests
- Prefer extracting a well-named function over adding comments
- Flag anything that looks like a genuine bug separately - do not fix it here
- Keep the diff as small as possible`,
    tags: ["ai", "refactoring", "workflow"],
    isFavorite: true,
  },

  // DevOps -----------------------------------------------------------------
  {
    id: "seed-item-dockerfile",
    title: "Multi-Stage Dockerfile for Next.js",
    description: "Production image build with a slim runtime stage",
    typeSlug: "snippet",
    collectionSlug: "devops",
    language: "dockerfile",
    content: `FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]`,
    tags: ["docker", "nextjs", "deployment"],
    isPinned: true,
  },
  {
    id: "seed-item-deploy-script",
    title: "Deploy to Production",
    description: "Build, tag and push the image, then roll the deployment",
    typeSlug: "command",
    collectionSlug: "devops",
    language: "bash",
    content: `docker build -t registry.example.com/devstash:$(git rev-parse --short HEAD) .
docker push registry.example.com/devstash:$(git rev-parse --short HEAD)
kubectl set image deployment/devstash app=registry.example.com/devstash:$(git rev-parse --short HEAD)
kubectl rollout status deployment/devstash`,
    tags: ["deployment", "docker", "kubernetes"],
  },
  {
    id: "seed-item-docker-build-docs",
    title: "Docker Build Documentation",
    description: "Official reference for BuildKit and multi-stage builds",
    typeSlug: "link",
    collectionSlug: "devops",
    url: "https://docs.docker.com/build/",
    tags: ["docker", "docs"],
  },
  {
    id: "seed-item-actions-docs",
    title: "GitHub Actions Documentation",
    description: "Workflow syntax, triggers and reusable actions",
    typeSlug: "link",
    collectionSlug: "devops",
    url: "https://docs.github.com/en/actions",
    tags: ["ci", "docs"],
  },

  // Terminal Commands --------------------------------------------------------
  {
    id: "seed-item-git-rebase",
    title: "Interactive Rebase onto Main",
    description: "Clean up local commits before opening a PR",
    typeSlug: "command",
    collectionSlug: "terminal-commands",
    language: "bash",
    content: "git rebase -i main",
    tags: ["git"],
    isFavorite: true,
  },
  {
    id: "seed-item-docker-logs",
    title: "Tail Compose Logs",
    description: "Follow the last 100 lines from every service",
    typeSlug: "command",
    collectionSlug: "terminal-commands",
    language: "bash",
    content: "docker compose logs -f --tail=100",
    tags: ["docker"],
  },
  {
    id: "seed-item-kill-port",
    title: "Find and Kill a Process on a Port",
    description: "Locate whatever is bound to a port, then stop it",
    typeSlug: "command",
    collectionSlug: "terminal-commands",
    language: "bash",
    content: "lsof -i :3000 -t | xargs kill -9",
    tags: ["process", "terminal"],
    isPinned: true,
  },
  {
    id: "seed-item-npm-outdated",
    title: "List and Update Outdated Packages",
    description: "Check what's behind, then bump to the latest allowed by semver",
    typeSlug: "command",
    collectionSlug: "terminal-commands",
    language: "bash",
    content: "npm outdated && npm update",
    tags: ["npm", "dependencies"],
  },

  // Design Resources ----------------------------------------------------------
  {
    id: "seed-item-tailwind-docs",
    title: "Tailwind CSS Documentation",
    description: "Utility classes, theming and the v4 @theme directive",
    typeSlug: "link",
    collectionSlug: "design-resources",
    url: "https://tailwindcss.com/docs",
    tags: ["css", "tailwind"],
    isFavorite: true,
  },
  {
    id: "seed-item-shadcn-docs",
    title: "shadcn/ui Components",
    description: "Copy-paste component library built on Radix primitives",
    typeSlug: "link",
    collectionSlug: "design-resources",
    url: "https://ui.shadcn.com",
    tags: ["components", "ui"],
  },
  {
    id: "seed-item-material-design",
    title: "Material Design 3",
    description: "Google's design system: foundations, components and tokens",
    typeSlug: "link",
    collectionSlug: "design-resources",
    url: "https://m3.material.io",
    tags: ["design-system"],
  },
  {
    id: "seed-item-lucide-icons",
    title: "Lucide Icons",
    description: "The open-source icon set the app's type icons come from",
    typeSlug: "link",
    collectionSlug: "design-resources",
    url: "https://lucide.dev",
    tags: ["icons"],
  },
];

/**
 * The demo account's password.
 *
 * Never hardcoded: a committed password becomes a working login the moment a
 * credentials provider exists, and it stays in git history afterwards. Set
 * `SEED_DEMO_PASSWORD` to choose one, otherwise a random password is generated
 * and printed once — copy it from the seed output if you want to sign in.
 */
function resolveDemoPassword(): { password: string; generated: boolean } {
  const fromEnv = process.env.SEED_DEMO_PASSWORD?.trim();

  if (fromEnv) {
    return { password: fromEnv, generated: false };
  }

  return { password: randomBytes(12).toString("base64url"), generated: true };
}

async function seedUser() {
  const { password, generated } = resolveDemoPassword();
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@devstash.io" },
    update: {
      name: "Demo User",
      password: passwordHash,
      isPro: false,
      emailVerified: new Date(),
    },
    create: {
      id: DEMO_USER_ID,
      email: "demo@devstash.io",
      name: "Demo User",
      password: passwordHash,
      isPro: false,
      emailVerified: new Date(),
    },
  });

  console.log(`✓ demo user (${user.email})`);

  if (generated) {
    console.log(`  generated password: ${password}`);
    console.log("  set SEED_DEMO_PASSWORD to pin it across runs");
  }

  return user;
}

async function seedItemTypes() {
  for (const type of ITEM_TYPES) {
    await prisma.itemType.upsert({
      where: { id: type.id },
      update: { ...type, isSystem: true, userId: null },
      create: { ...type, isSystem: true },
    });
  }

  console.log(`✓ ${ITEM_TYPES.length} system item types`);
}

async function seedCollections(userId: string) {
  for (const collection of COLLECTIONS) {
    await prisma.collection.upsert({
      where: { id: collection.id },
      update: { ...collection, userId },
      create: { ...collection, userId },
    });
  }

  console.log(`✓ ${COLLECTIONS.length} collections`);
}

async function seedTag(userId: string, name: string) {
  return prisma.tag.upsert({
    where: { userId_name: { userId, name } },
    update: {},
    create: { userId, name },
  });
}

async function seedItems(userId: string) {
  const typeIdBySlug = new Map(ITEM_TYPES.map((type) => [type.slug, type.id]));
  const collectionIdBySlug = new Map(COLLECTIONS.map((c) => [c.slug, c.id]));

  for (const item of ITEMS) {
    const typeId = typeIdBySlug.get(item.typeSlug);
    const collectionId = collectionIdBySlug.get(item.collectionSlug);
    if (!typeId || !collectionId) {
      throw new Error(`Unknown type/collection slug for item "${item.title}"`);
    }

    const data = {
      title: item.title,
      description: item.description,
      contentType: "text" as const,
      content: item.content ?? null,
      url: item.url ?? null,
      language: item.language ?? null,
      isFavorite: item.isFavorite ?? false,
      isPinned: item.isPinned ?? false,
      userId,
      typeId,
      collectionId,
    };

    await prisma.item.upsert({
      where: { id: item.id },
      update: data,
      create: { id: item.id, ...data },
    });

    for (const tagName of item.tags) {
      const tag = await seedTag(userId, tagName);
      await prisma.itemTag.upsert({
        where: { itemId_tagId: { itemId: item.id, tagId: tag.id } },
        update: {},
        create: { itemId: item.id, tagId: tag.id },
      });
    }
  }

  console.log(`✓ ${ITEMS.length} items`);
}

async function main(): Promise<void> {
  const user = await seedUser();
  await seedItemTypes();
  await seedCollections(user.id);
  await seedItems(user.id);
  console.log("\nSeed complete.");
}

main()
  .catch((error: unknown) => {
    console.error("\n✗ Seed failed:");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
