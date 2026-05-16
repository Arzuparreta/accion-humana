import type { MetadataRoute } from "next"
import { BRAND_URL } from "@/lib/brand"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: `${BRAND_URL}/sitemap.xml`,
    host: BRAND_URL,
  }
}
