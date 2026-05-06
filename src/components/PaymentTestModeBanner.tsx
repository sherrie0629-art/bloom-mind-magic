import { useTranslation } from "react-i18next";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

export function PaymentTestModeBanner() {
  const { t } = useTranslation();
  if (!clientToken?.startsWith("test_")) return null;

  return (
    <div className="w-full bg-secondary/20 border-b border-secondary/30 px-4 py-2 text-center text-xs text-foreground">
      {t("paymentTestBanner.text")}{" "}
      <a
        href="https://docs.lovable.dev/features/payments#test-and-live-environments"
        target="_blank"
        rel="noopener noreferrer"
        className="underline font-medium"
      >
        {t("paymentTestBanner.readMore")}
      </a>
    </div>
  );
}
