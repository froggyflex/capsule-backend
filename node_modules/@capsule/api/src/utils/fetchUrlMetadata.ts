import ogs from "open-graph-scraper";

type OGImage = {
  url?: string;
};

export async function fetchUrlMetadata(url: string) {
  try {
    const { result } = await ogs({
      url,
      timeout: 5000,
      fetchOptions: {
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; CapsuleBot/1.0)"
        }
      }
    });

    const ogImageRaw = result.ogImage as
      | OGImage
      | OGImage[]
      | undefined;

    const previewImage = Array.isArray(ogImageRaw)
      ? ogImageRaw[0]?.url
      : ogImageRaw?.url;

    return {
      title: result.ogTitle || result.twitterTitle,
      description:
        result.ogDescription || result.twitterDescription,
      previewImage
    };
  } catch {
    console.warn("Metadata fetch failed for", url);
    return {};
  }
}
