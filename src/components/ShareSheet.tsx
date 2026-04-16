import { Copy, Download, Share2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  imageDataUrl: string | null;
  title?: string;
  text?: string;
  url?: string;
}

const ShareSheet = ({ open, onClose, imageDataUrl, title, text, url }: ShareSheetProps) => {
  const handleCopyLink = async () => {
    const shareUrl = url || window.location.href;
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied! ✨");
    onClose();
  };

  const handleDownload = () => {
    if (!imageDataUrl) return;
    const a = document.createElement("a");
    a.href = imageDataUrl;
    a.download = "soul-sanctuary.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Image saved ✨");
    onClose();
  };

  const handleNativeShare = async () => {
    if (!imageDataUrl) return;
    try {
      const res = await fetch(imageDataUrl);
      const blob = await res.blob();
      const file = new File([blob], "soul-sanctuary.png", { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: title || "Soul Sanctuary",
          text: text || "Discover yours ✨",
          files: [file],
        });
        onClose();
        return;
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
    // Fallback: just download
    handleDownload();
  };

  const actions = [
    { icon: Copy, label: "Copy Link", onClick: handleCopyLink },
    { icon: Download, label: "Save Image", onClick: handleDownload, disabled: !imageDataUrl },
    { icon: Share2, label: "Share", onClick: handleNativeShare, disabled: !imageDataUrl },
  ];

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[50vh]">
        <DrawerHeader className="pb-2">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-base font-semibold">Share</DrawerTitle>
            <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
        </DrawerHeader>

        {imageDataUrl && (
          <div className="flex justify-center px-6 pb-3">
            <img
              src={imageDataUrl}
              alt="Preview"
              className="max-h-40 rounded-xl shadow-card object-contain"
            />
          </div>
        )}

        <div className="flex justify-center gap-8 px-6 pb-6 pt-2">
          {actions.map(({ icon: Icon, label, onClick, disabled }) => (
            <button
              key={label}
              onClick={onClick}
              disabled={disabled}
              className="flex flex-col items-center gap-2 text-foreground disabled:opacity-40"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted transition-colors hover:bg-muted/80 active:scale-95">
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ShareSheet;
