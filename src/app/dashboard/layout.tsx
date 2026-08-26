import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  return (
    <SidebarProvider className="min-h-full flex-1">
      <Sidebar />
      <SidebarInset>
        <TopBar />
        <div className="min-w-0 flex-1 p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
