import { useLocale } from "@/hooks/useLocale";

/**
 * Mounts useLocale so the user's saved language preference syncs from
 * profiles.locale on login. Renders nothing.
 */
const LocaleSync = () => {
  useLocale();
  return null;
};

export default LocaleSync;
