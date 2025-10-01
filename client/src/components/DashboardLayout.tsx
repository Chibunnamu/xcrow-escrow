import { AppSidebar } from "./AppSidebar";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, Menu } from "lucide-react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps): JSX.Element => {
  const [, setLocation] = useLocation();

  const { data: userData, isLoading } = useQuery<{ user: any } | null>({
    queryKey: ["/api/user"],
  });

  if (isLoading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!userData?.user) {
    setLocation("/login");
    return <></>;
  }

  return (
    <SidebarProvider>
      <AppSidebar user={userData.user} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-white px-4 md:hidden">
          <SidebarTrigger className="h-10 w-10">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </SidebarTrigger>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#493d9e] flex items-center justify-center">
              <span className="text-white font-bold text-xs">X</span>
            </div>
            <span className="text-lg font-bold text-[#041d0f]">XCROW</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#493d9e] flex items-center justify-center">
            <span className="text-white font-semibold text-xs">
              {userData.user.name?.charAt(0) || userData.user.email.charAt(0).toUpperCase()}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};
