"use client";

import { Blog, BlogCategory, BlogFaq } from "@prisma/client";
import Link from "next/link";
import { useState } from "react";
import BlogContentRenderer from "./BlogContentRenderer";

type BlogDetail = Blog & {
  category: BlogCategory | null;
  faqs: BlogFaq[];
};

export default function BlogDetail({ blog }: { blog: BlogDetail }) {
  const formatDate = (date: Date | string | null) =>
    date
      ? new Date(date).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "";

  return (
    <div className="min-h-screen bg-[#151718] text-white font-['Clash_Grotesk']">
      {/* BACK LINK STRIP */}
      
      <div className="border-b border-[#272A2D]">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <Link
            href="/blogs"
            className="inline-flex items-center gap-2 text-sm text-[#D3D3D3] hover:text-[#BBF000] transition-colors group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">
              ←
            </span>
            <span>Back to all blogs</span>
          </Link>
        </div>
      </div>

      <article>
        {/* ARTICLE HEADER */}
        <header className="max-w-4xl mx-auto px-6 pt-14 pb-10">
          {blog.category && (
            <div className="mb-6 flex items-center gap-3">
              <span className="px-3.5 py-1.5 rounded-full bg-[#BBF000] text-[#151718] text-[10px] font-bold uppercase tracking-wider">
                {blog.category.name}
              </span>
              <div className="h-px flex-1 bg-[#272A2D] max-w-[120px]" />
            </div>
          )}

          <h1 className="font-['Boxing'] text-4xl md:text-5xl lg:text-6xl leading-[1.05] tracking-tight text-white">
            {blog.title}
          </h1>

          <p className="mt-6 text-lg md:text-xl text-[#D3D3D3] leading-relaxed">
            {blog.description}
          </p>

          <div className="mt-8 flex items-center gap-3 text-xs text-[#D3D3D3]/60 font-medium uppercase tracking-wider">
            <span>{formatDate(blog.publishedAt)}</span>
            <div className="h-1 w-1 rounded-full bg-[#3D4042]" />
            <span className="text-[#BBF000]">Fuel Gym</span>
          </div>
        </header>

        {/* COVER IMAGE */}
        {blog.coverImage && (
          <div className="max-w-5xl mx-auto px-6 mb-14">
            <div className="rounded-2xl overflow-hidden border border-[#272A2D] bg-[#272A2D]">
              <img
                src={blog.coverImage}
                alt={blog.title}
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        )}

        {/* CONTENT */}
        <div className="max-w-3xl mx-auto px-6 pb-16">
          <BlogContentRenderer data={blog.content as any} />
        </div>

        {/* FAQ SECTION */}
        {blog.faqs && blog.faqs.length > 0 && (
          <section className="border-t border-[#272A2D] bg-[#1a1d1e]">
            <div className="max-w-3xl mx-auto px-6 py-16">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px w-8 bg-[#BBF000]" />
                <p className="text-[#BBF000] uppercase tracking-[0.3em] text-xs font-semibold">
                  FAQ
                </p>
              </div>
              <h2 className="font-['Boxing'] text-3xl md:text-4xl text-white tracking-tight mb-10">
                Frequently Asked
              </h2>
              <div className="space-y-3">
                {blog.faqs.map((faq) => (
                  <FaqItem key={faq.id} faq={faq} />
                ))}
              </div>
            </div>
          </section>
        )}
      </article>

      {/* FOOTER CTA */}
      <section className="border-t border-[#272A2D]">
        <div className="max-w-4xl mx-auto px-6 py-14 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-[#D3D3D3]/60 mb-3">
            Keep training your mind
          </p>
          <Link
            href="/blogs"
            className="inline-flex items-center gap-2 text-[#BBF000] font-semibold text-lg border-b-2 border-[#BBF000] pb-1 hover:gap-3 transition-all"
          >
            <span>Read more articles</span>
            <span>→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FAQ ACCORDION ITEM
// ─────────────────────────────────────────────────────────────
function FaqItem({ faq }: { faq: BlogFaq }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`border rounded-xl bg-[#1c1f20] overflow-hidden transition-colors ${
        open ? "border-[#BBF000]/40" : "border-[#272A2D]"
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[#272A2D]/40 transition-colors"
      >
        <span className="font-semibold text-white text-base md:text-[17px]">
          {faq.question}
        </span>
        <span
          className={`flex-shrink-0 w-7 h-7 rounded-full bg-[#BBF000] text-[#151718] flex items-center justify-center text-lg leading-none font-bold transition-transform duration-300 ${
            open ? "rotate-45" : ""
          }`}
        >
          +
        </span>
      </button>
      <div
        className={`grid transition-all duration-300 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-5 pt-1 text-[#D3D3D3] leading-relaxed">
            {faq.answer}
          </p>
        </div>
      </div>
    </div>
  );
}