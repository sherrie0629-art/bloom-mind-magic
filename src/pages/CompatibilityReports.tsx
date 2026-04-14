import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, ChevronRight, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface CompatReport {
  id: string;
  partner_info: any;
  result_data: any;
  created_at: string;
}

const CompatibilityReports = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reports, setReports] = useState<CompatReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("compatibility_reports")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setReports(data || []);
        setLoading(false);
      });
  }, [user]);

  const formatDate = (s: string) => {
    const d = new Date(s);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " +
      d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
  };

  return (
    <div className="min-h-screen bg-gradient-calm pb-24">
      <div className="flex items-center justify-between px-4 py-3 pt-14">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/profile")} className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="font-display text-lg font-semibold text-foreground">💕 Compatibility Reports</h2>
        </div>
        <button
          onClick={() => navigate("/assessment/compatibility")}
          className="flex items-center gap-1 rounded-full bg-gradient-golden px-3 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          New Test
        </button>
      </div>

      <div className="mt-2 space-y-3 px-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
          </div>
        ) : reports.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-4xl">💕</p>
            <p className="mt-3 text-sm text-muted-foreground">No compatibility reports yet</p>
            <button
              onClick={() => navigate("/assessment/compatibility")}
              className="mt-4 rounded-xl bg-gradient-golden px-6 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Take a Compatibility Test
            </button>
          </div>
        ) : (
          reports.map((r, i) => {
            const d = r.result_data as any;
            const partner = r.partner_info as any;
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/compatibility-reports/${r.id}`)}
                className="rounded-2xl bg-card p-4 shadow-card cursor-pointer active:scale-[0.98] transition-transform"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-warm to-lavender">
                    <Heart className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-sm font-semibold text-foreground truncate">
                        {d?.emoji || "💕"} {d?.title || "Compatibility Analysis"}
                      </h3>
                      {d?.overallScore && (
                        <span className="shrink-0 rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-bold text-secondary">
                          {d.overallScore}%
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">
                      with {partner?.name || "Partner"} · {d?.summary?.slice(0, 30) || ""}
                    </p>
                    <p className="mt-1.5 text-[10px] text-muted-foreground/60">{formatDate(r.created_at)}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 self-center" />
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CompatibilityReports;
