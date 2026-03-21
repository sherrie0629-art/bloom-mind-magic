import { motion } from "framer-motion";

interface ResultAIImageProps {
  imageUrl: string | null;
  loading: boolean;
}

const ResultAIImage = ({ imageUrl, loading }: ResultAIImageProps) => {
  if (!loading && !imageUrl) return null;

  return (
    <div className="mb-4">
      {loading ? (
        <div className="mx-auto h-48 w-48 rounded-2xl bg-card shadow-card flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="h-8 w-8 rounded-full border-2 border-muted border-t-secondary"
          />
        </div>
      ) : imageUrl ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center"
        >
          <img
            src={imageUrl}
            alt="AI 生成插画"
            className="h-48 w-48 rounded-2xl object-cover shadow-card"
          />
        </motion.div>
      ) : null}
    </div>
  );
};

export default ResultAIImage;
