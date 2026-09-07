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
    <main className="min-h-screen bg-black text-white">
      {/* BACK LINK STRIP */}
      <div className="border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-5">
          <Link
            href="/blogs"
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-lime-400 transition-colors group"
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
        <header className="max-w-4xl mx-auto px-6 md:px-10 pt-16 md:pt-20 pb-12">
          {blog.category && (
            <div className="mb-7 flex items-center gap-3">
              <span className="px-3.5 py-1.5 rounded-full bg-lime-400 text-black text-[10px] font-bold uppercase tracking-wider">
                {blog.category.name}
              </span>

              <div className="h-px flex-1 bg-white/10 max-w-[120px]" />
            </div>
          )}

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase leading-[0.98] tracking-tight text-white">
            {blog.title}
          </h1>

          <p className="mt-7 text-lg md:text-xl text-neutral-400 leading-8 max-w-3xl">
            {blog.description}
          </p>

          <div className="mt-8 flex items-center gap-3 text-xs text-neutral-500 font-bold uppercase tracking-[0.2em]">
            <span>{formatDate(blog.publishedAt)}</span>

            <div className="h-1 w-1 rounded-full bg-neutral-700" />

            <span className="text-lime-400">Fuel Gym</span>
          </div>
        </header>

        {/* COVER IMAGE */}
        {blog.coverImage && (

<div className="max-w-3xl mx-auto px-6 md:px-8 mb-8">
  <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-950">
    <img
      src={blog.coverImage}
      alt={blog.title}
      className="w-full max-h-[350px] object-cover"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
  </div>
</div>
)}


        {/* CONTENT */}
        <div className="max-w-3xl mx-auto px-6 md:px-10 pb-20">
          <BlogContentRenderer data={blog.content as any} />
        </div>

        {/* FAQ SECTION */}
        {blog.faqs && blog.faqs.length > 0 && (
          <section className="border-t border-white/[0.06] bg-neutral-950">
            <div className="max-w-3xl mx-auto px-6 md:px-10 py-20">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px w-8 bg-lime-400" />

                <p className="text-lime-400 uppercase tracking-[0.3em] text-xs font-bold">
                  FAQ
                </p>
              </div>

              <h2 className="text-4xl md:text-5xl font-black uppercase leading-tight text-white mb-12">
                Frequently Asked{" "}
                <span className="text-lime-400">
                  Questions
                </span>
              </h2>

              <div className="space-y-4">
                {blog.faqs.map((faq) => (
                  <FaqItem key={faq.id} faq={faq} />
                ))}
              </div>
            </div>
          </section>
        )}
      </article>

      {/* FOOTER CTA */}
      <section className="border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-6 md:px-10 py-16 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500 mb-4">
            Keep training your mind
          </p>

          <Link
            href="/blogs"
            className="inline-flex items-center gap-2 text-lime-400 font-bold text-lg uppercase tracking-wide border-b-2 border-lime-400 pb-1 hover:gap-3 transition-all"
          >
            <span>Read More Articles</span>
            <span>→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────
// FAQ ACCORDION ITEM
// ─────────────────────────────────────────────────────────────

function FaqItem({ faq }: { faq: BlogFaq }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`border rounded-2xl bg-black/50 overflow-hidden transition-colors ${
        open
          ? "border-lime-400/30"
          : "border-white/10"
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-lime-400/[0.03] transition-colors"
      >
        <span className="font-bold text-white text-base md:text-[17px]">
          {faq.question}
        </span>

        <span
          className={`flex-shrink-0 w-8 h-8 rounded-full bg-lime-400 text-black flex items-center justify-center text-lg leading-none font-black transition-transform duration-300 ${
            open ? "rotate-45" : ""
          }`}
        >
          +
        </span>
      </button>

      <div
        className={`grid transition-all duration-300 ease-out ${
          open
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-6 pb-6 pt-1 text-neutral-400 leading-7">
            {faq.answer}
          </p>
        </div>
      </div>
    </div>
  );
}
