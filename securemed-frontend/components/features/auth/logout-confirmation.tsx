"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";

interface LogoutConfirmationProps {
  children?: React.ReactNode;
}

export function LogoutConfirmation({ children }: LogoutConfirmationProps) {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {children || (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-background/80 backdrop-blur-2xl border-border/50 rounded-[32px] shadow-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-black tracking-tight">
            End Session?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base text-muted-foreground">
            You are about to securely sign out of SecureMed. All unsaved changes
            will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="rounded-xl border-border/50 bg-muted/20 hover:bg-muted/40 h-10 mt-0">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 h-10 shadow-lg shadow-destructive/20"
            onClick={handleLogout}
          >
            Confirm Logout
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
