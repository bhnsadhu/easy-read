import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: ["/", "/privacy"], disallow: ["/c/", "/r/", "/go", "/qr/", "/api/", "/dashboard", "/materials", "/classes", "/auth/", "/styleguide"] },
    ],
    sitemap: `${publicEnv.NEXT_PUBLIC_APP_URL}/sitemap.xml`,
  };
}
