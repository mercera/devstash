import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getRecentCollections } from "@/lib/db/collections";
import { getItemTypesWithCounts } from "@/lib/db/items";
import { getCurrentUser } from "@/lib/db/user";

/**
 * The sidebar's types, collections and footer user come from Prisma, so the
 * layout must render per-request — without this, Next.js would prerender it
 * once at build time and serve that frozen snapshot instead of live data.
 */
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const [itemTypes, collections, user] = await Promise.all([
    getItemTypesWithCounts(),
    getRecentCollections(),
    getCurrentUser(),
  ]);

  return (
    <SidebarProvider className="min-h-full flex-1">
      <Sidebar itemTypes={itemTypes} collections={collections} user={user} />
      <SidebarInset>
        <TopBar />
        <div className="min-w-0 flex-1 p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
