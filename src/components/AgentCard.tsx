import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface AgentCardProps {
  id: string;
  name: string;
  title: string;
  description: string;
  image: string;
  gradient: string;
  bondLevel?: number;
}

const AgentCard = ({ id, name, title, description, image, gradient, bondLevel }: AgentCardProps) => {
  const navigate = useNavigate();

  return (
    <motion.button
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(`/chat?agent=${id}`)}
      className={`group flex flex-col items-center rounded-2xl bg-card p-4 shadow-card transition-shadow hover:shadow-soft text-left w-full ${
        bondLevel && bondLevel >= 4 ? "ring-1 ring-secondary/30" : ""
      }`}
    >
      <div className="relative">
        <div
          className={`mb-3 h-20 w-20 overflow-hidden rounded-2xl ${gradient} p-0.5`}
        >
          <img
            src={image}
            alt={name}
            className="h-full w-full rounded-[14px] object-cover bg-card"
            loading="lazy"
          />
        </div>
        {bondLevel && bondLevel > 1 && (
          <div className="absolute -top-1 -right-1 flex items-center gap-0.5 rounded-full bg-card px-1.5 py-0.5 shadow-card text-[9px]">
            {"⭐".repeat(Math.min(bondLevel, 5))}
          </div>
        )}
      </div>
      <h3 className="font-display text-sm font-semibold text-foreground">{name}</h3>
      <p className="text-[11px] font-medium text-secondary">{title}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground line-clamp-2 text-center">
        {description}
      </p>
    </motion.button>
  );
};

export default AgentCard;
