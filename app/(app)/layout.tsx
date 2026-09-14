import { BottomNav } from "@/components/patterns/BottomNav";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { ChatBubbleSlot } from "@/app/(app)/ChatBubbleSlot";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="safe-top flex min-h-dvh flex-col">
        <OfflineBanner />
        <main className="flex-1 px-screen pb-[96px]">{children}</main>
        <ChatBubbleSlot />
        <BottomNav />
      </div>
    </ToastProvider>
  );
}
