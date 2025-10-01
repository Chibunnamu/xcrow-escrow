import { useLocation } from "wouter";
import { Home, Building2, Store, Bell, Settings, HelpCircle, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  user: {
    name?: string;
    email: string;
  };
}

export const AppSidebar = ({ user }: AppSidebarProps): JSX.Element => {
  const [location, setLocation] = useLocation();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Logout failed");
      }
      return response.json();
    },
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  const menuItems = [
    { icon: Home, label: "Dashboard", path: "/seller-dashboard", badge: null },
    { icon: Building2, label: "Office", path: "/office", badge: null },
    { icon: Store, label: "Marketplace", path: "/marketplace", badge: null },
    { icon: Bell, label: "Notifications", path: "/notifications", badge: 3 },
  ];

  const supportItems = [
    { icon: Settings, label: "Settings", path: "/settings" },
    { icon: HelpCircle, label: "Help Center", path: "/help" },
  ];

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b border-gray-200 p-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#493d9e] flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">X</span>
          </div>
          <span className="text-xl font-bold text-[#041d0f]">
            XCROW
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      onClick={() => setLocation(item.path)}
                      isActive={isActive}
                      className={cn(
                        "transition-colors",
                        isActive
                          ? "bg-[#493d9e]/10 text-[#493d9e] hover:bg-[#493d9e]/20"
                          : "text-gray-700 hover:bg-gray-100"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                      {item.badge && (
                        <Badge
                          variant="destructive"
                          className="ml-auto h-5 min-w-5 px-1.5 text-xs"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Support</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {supportItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      onClick={() => setLocation(item.path)}
                      isActive={isActive}
                      className={cn(
                        "transition-colors",
                        isActive
                          ? "bg-[#493d9e]/10 text-[#493d9e] hover:bg-[#493d9e]/20"
                          : "text-gray-700 hover:bg-gray-100"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-[#493d9e] flex items-center justify-center shrink-0">
            <span className="text-white font-semibold text-sm">
              {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.name || "User"}
            </p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        </div>
        <Button
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          variant="outline"
          className="w-full justify-start gap-2 text-gray-700 hover:text-red-600 hover:border-red-300"
        >
          <LogOut className="w-4 h-4" />
          <span>
            {logoutMutation.isPending ? "Signing out..." : "Sign Out"}
          </span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};
