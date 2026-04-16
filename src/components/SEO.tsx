import { Helmet } from "react-helmet-async";

const SITE_NAME = "Soul Sanctuary";
const DEFAULT_OG_IMAGE = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/bd8c9ec6-2ab8-49c0-bd7a-e2f33f97134f/id-preview-27409fe9--18334647-34e5-4097-9b46-f600ad9a77b5.lovable.app-1774023702893.png";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  canonical?: string;
}

const SEO = ({
  title = `${SITE_NAME} — AI Companions for Self-Discovery`,
  description = "Find your soul sanctuary. AI companions that listen without judgement, help you understand yourself through MBTI, Enneagram & more — available 24/7.",
  keywords = "AI companion, self-discovery, mental wellness, soul sanctuary",
  ogTitle,
  ogDescription,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  canonical,
}: SEOProps) => (
  <Helmet>
    <title>{title}</title>
    <meta name="description" content={description} />
    <meta name="keywords" content={keywords} />

    <meta property="og:type" content={ogType} />
    <meta property="og:title" content={ogTitle || title} />
    <meta property="og:description" content={ogDescription || description} />
    <meta property="og:image" content={ogImage} />
    <meta property="og:site_name" content={SITE_NAME} />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={ogTitle || title} />
    <meta name="twitter:description" content={ogDescription || description} />
    <meta name="twitter:image" content={ogImage} />

    {canonical && <link rel="canonical" href={canonical} />}
  </Helmet>
);

export default SEO;
