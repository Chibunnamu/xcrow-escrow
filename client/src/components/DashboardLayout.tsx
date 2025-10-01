import { Sidebar } from "./Sidebar";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

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
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={userData.user} />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
};
