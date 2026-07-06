// app/sitemap.ts
import { prisma } from "@/prisma";
import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://fuelgym.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogs = await prisma.blog.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, updatedAt: true, publishedAt: true },
  });

  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/blogs`, changeFrequency: "daily", priority: 0.9 },
    ...blogs.map((b) => ({
      url: `${SITE_URL}/blogs/${b.id}`,
      lastModified: b.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}