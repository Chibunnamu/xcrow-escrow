
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

import { type User } from "@shared/schema";

export function EmailConsent() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Use simple generic or cast for user data
  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: async (consent: boolean) => {
      const res = await fetch("/api/user/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent }),
      });
      if (!res.ok) throw new Error("Failed to update consent");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setOpen(false);
      toast({
        title: "Preferences Saved",
        description: "Your email notification preferences have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    // Only show if user is logged in and emailNotifications is null/undefined
    // In our schema, we made it optional, so it might be undefined for old users.
    // If it is false, they explicitly opted out, so don't show.
    // Wait, if it defaults to false, how do we distinguish "opted out" from "new user default"?
    // The requirement says "When a user signs up, show a popup".
    // If we defaulted to NULL in database, we could distinguish.
    // But currently `boolean("email_notifications")` usually defaults to null in Postgres if not specified "notNull"?
    // Drizzle `boolean` without `notNull()` allows null.
    // My schema update: `emailNotifications: boolean("email_notifications")`. It allows null.
    // So if user.emailNotifications === null (or undefined in JSON), we show popup.
    if (user && (user.emailNotifications === null || user.emailNotifications === undefined)) {
      setOpen(true);
    }
  }, [user]);

  const handleConsent = (consent: boolean) => {
    mutation.mutate(consent);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Enable Email Notifications</DialogTitle>
          <DialogDescription>
            Stay updated with your transaction status, logins, and payments. 
            We promise not to spam you. You can change this anytime in settings.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col space-y-2 sm:space-y-0 text-center">
            <Button onClick={() => handleConsent(true)} className="w-full mb-2 sm:mb-0">
              Yes, Enable Notifications
            </Button>
            <Button onClick={() => handleConsent(false)} variant="outline" className="w-full">
              No, Thanks
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
