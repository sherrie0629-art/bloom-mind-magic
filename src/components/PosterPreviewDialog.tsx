import { motion, AnimatePresence } from "framer-motion";
import { X, Download } from "lucide-react";

interface PosterPreviewDialogProps {
  open: boolean;
  dataUrl: string | null;
  onClose: () => void;
  onDownload: () => void;
}

const PosterPreviewDialog = ({ open, dataUrl, onClose, onDownload }: PosterPreviewDialogProps) => {
  if (!open || !dataUrl) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col items-center bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <div className="flex w-full items-center justify-between px-4 py-3">
          <p className="text-xs text-white/60">长按图片保存到相册</p>
          <button onClick={onClose} className="rounded-full bg-white/10 p-2">
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        <div
          className="flex-1 overflow-auto px-4 pb-4 flex items-start justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={dataUrl}
            alt="测评海报"
            className="w-full max-w-[340px] rounded-xl shadow-2xl"
            style={{ WebkitTouchCallout: "default" }}
          />
        </div>

        <div className="w-full px-6 pb-8 pt-2">
          <button
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-golden py-3 text-sm font-semibold text-primary-foreground"
          >
            <Download className="h-4 w-4" /> 保存到本地
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PosterPreviewDialog;
