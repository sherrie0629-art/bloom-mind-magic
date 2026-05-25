import { Copy, Download, Share2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  imageDataUrl: string | null;
  title?: string;
  text?: string;
  url?: string;
  publicImageUrl?: string;
}

const SHARE_URL = "https://islandai.life";

const ShareSheet = ({ open, onClose, imageDataUrl, title, text, url, publicImageUrl }: ShareSheetProps) => {
  const isMobile = useIsMobile();
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(publicImageUrl || null);

  // Auto-upload poster for social sharing URLs
  useEffect(() => {
    if (!open || !imageDataUrl || publicImageUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) return;
        const res = await fetch(imageDataUrl);
        const blob = await res.blob();
        const fileName = `${uid}/poster_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
        const { error } = await supabase.storage
          .from("shared-posters")
          .upload(fileName, blob, { contentType: "image/png", upsert: false });
        if (!error && !cancelled) {
          const { data } = supabase.storage.from("shared-posters").getPublicUrl(fileName);
          setUploadedUrl(data?.publicUrl || null);
        }
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [open, imageDataUrl, publicImageUrl]);

  const shareUrl = url || SHARE_URL;
  const shareTitle = title || "Soul Sanctuary";
  const shareText = text || "Discover yours ✨";

  const handleNativeShare = useCallback(async () => {
    if (!imageDataUrl) return;
    try {
      const res = await fetch(imageDataUrl);
      const blob = await res.blob();
      const file = new File([blob], "soul-sanctuary.png", { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          files: [file],
        });
        onClose();
        return;
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
    toast.info("System share not available, use options below");
  }, [imageDataUrl, shareTitle, shareText, onClose]);

  const handleDownload = useCallback(() => {
    if (!imageDataUrl) return;
    const a = document.createElement("a");
    a.href = imageDataUrl;
    a.download = "soul-sanctuary.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Image saved ✨");
  }, [imageDataUrl]);

  const handleCopyLink = useCallback(async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied! ✨");
  }, [shareUrl]);

  const openPinterest = useCallback(() => {
    const media = uploadedUrl || "";
    const pinUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&media=${encodeURIComponent(media)}&description=${encodeURIComponent(shareText)}`;
    window.open(pinUrl, "_blank", "noopener");
  }, [shareUrl, shareText, uploadedUrl]);

  const openX = useCallback(() => {
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(tweetUrl, "_blank", "noopener");
  }, [shareUrl, shareText]);

  const openFacebook = useCallback(() => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(fbUrl, "_blank", "noopener");
  }, [shareUrl]);

  const openWhatsApp = useCallback(() => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
    window.open(waUrl, "_blank", "noopener");
  }, [shareUrl, shareText]);

  const socialChannels = [
    { label: "Pinterest", icon: "📌", onClick: openPinterest },
    { label: "X", icon: "𝕏", onClick: openX },
    { label: "Facebook", icon: "📘", onClick: openFacebook },
    { label: "WhatsApp", icon: "💬", onClick: openWhatsApp },
    { label: "Copy Link", icon: "🔗", onClick: handleCopyLink },
    { label: "Save", icon: "💾", onClick: handleDownload, disabled: !imageDataUrl },
  ];

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[60vh]">
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
              className="max-h-36 rounded-xl shadow-card object-contain"
            />
          </div>
        )}

        {/* Mobile: prominent system share button */}
        {isMobile && imageDataUrl && (
          <div className="px-6 pb-3">
            <button
              onClick={handleNativeShare}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-primary-foreground font-medium transition-all active:scale-[0.98]"
            >
              <Share2 className="h-5 w-5" />
              <span>Share to...</span>
            </button>
          </div>
        )}

        {/* Social channel quick actions */}
        <div className="flex flex-wrap justify-center gap-4 px-6 pb-6 pt-1">
          {socialChannels.map(({ icon, label, onClick, disabled }) => (
            <button
              key={label}
              onClick={onClick}
              disabled={disabled}
              className="flex flex-col items-center gap-1.5 text-foreground disabled:opacity-40 min-w-[52px]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted transition-colors hover:bg-muted/80 active:scale-95 text-lg">
                {icon}
              </div>
              <span className="text-[10px] text-muted-foreground leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ShareSheet;
