// app/blogs/[id]/page.tsx
import { prisma } from "@/prisma";
import { notFound } from "next/navigation";
import { cache } from "react";
import BlogDetail from "./BlogDetail";
import { Header } from "@/app/components/Header";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://fuelgym.com";

// React cache dedupes the call so generateMetadata + Page hit the DB once.
const getBlog = cache(async (id: string) => {
  return prisma.blog.findUnique({
    where: { id },
    include: { category: true, faqs: true },
  });
});

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const blog = await getBlog(id);

  if (!blog || blog.status !== "PUBLISHED") notFound();

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: blog.title,
    description: blog.description,
    image: blog.coverImage ? [blog.coverImage] : undefined,
    datePublished: blog.publishedAt,
    dateModified: blog.updatedAt,
    author: { "@type": "Organization", name: "Fuel Gym" },
    publisher: {
      "@type": "Organization",
      name: "Fuel Gym",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blogs/${id}` },
  };

  const faqSchema =
    blog.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: blog.faqs.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      {/* @ts-ignore */}
      <BlogDetail blog={blog} />
    </>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const blog = await getBlog(id);
  if (!blog) return { title: "Blog not found — Fuel Gym" };

  const url = `${SITE_URL}/blogs/${id}`;

  return {
    title: `${blog.title} — Fuel Gym`,
    description: blog.description,
    alternates: { canonical: url },
    openGraph: {
      title: blog.title,
      description: blog.description,
      url,
      siteName: "Fuel Gym",
      type: "article",
      publishedTime: blog.publishedAt?.toISOString(),
      modifiedTime: blog.updatedAt.toISOString(),
      images: blog.coverImage
        ? [{ url: blog.coverImage, width: 1200, height: 630, alt: blog.title }]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: blog.title,
      description: blog.description,
      images: blog.coverImage ? [blog.coverImage] : [],
    },
  };
}