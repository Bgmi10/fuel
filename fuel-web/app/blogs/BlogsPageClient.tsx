"use client";

import { Blog, BlogCategory } from "@prisma/client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Header } from "../components/Header";
import { ContactForm } from "../components/Contactus";

type BlogWithCat = Blog & {
  category: BlogCategory | null;
};

export default function Page({
  blogs,
  categories,
}: {
  blogs: BlogWithCat[];
  categories: BlogCategory[];
}) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isContactOpen, setIsContactOpen] = useState(false);

  const filteredBlogs = useMemo(() => {
    if (selectedCategory === "all") return blogs;

    return blogs.filter(
      (blog) => blog.category?.id === selectedCategory
    );
  }, [blogs, selectedCategory]);

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
      <Header setIsContactOpen={setIsContactOpen} />

      <ContactForm
        open={isContactOpen}
        setOpen={setIsContactOpen}
      />

      {/* PAGE HEADER */}
      <section className="border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-12 pt-28 pb-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px w-12 bg-lime-400" />

            <p className="text-lime-400 text-xs md:text-sm font-bold uppercase tracking-[0.3em]">
              Knowledge & Insights
            </p>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight leading-[0.95]">
            Blogs &{" "}
            <span className="text-lime-400">
              Articles
            </span>
          </h1>

          {/* CATEGORY PILLS */}
          <div className="mt-10 flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-5 py-2.5 rounded-full whitespace-nowrap border text-sm font-bold transition-all duration-200 ${
                selectedCategory === "all"
                  ? "bg-lime-400 text-black border-lime-400"
                  : "bg-transparent border-white/10 text-neutral-400 hover:border-lime-400 hover:text-lime-400"
              }`}
            >
              All Blogs
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-5 py-2.5 rounded-full whitespace-nowrap border text-sm font-bold transition-all duration-200 ${
                  selectedCategory === cat.id
                    ? "bg-lime-400 text-black border-lime-400"
                    : "bg-transparent border-white/10 text-neutral-400 hover:border-lime-400 hover:text-lime-400"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* BLOG GRID */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 lg:px-12 py-16 md:py-20">
        {filteredBlogs.length === 0 ? (
          <div className="border border-white/10 rounded-3xl p-16 text-center bg-neutral-950">
            <h3 className="text-2xl font-black uppercase text-white">
              No Blogs Found
            </h3>

            <p className="text-neutral-500 mt-3">
              Try another category to see more articles.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredBlogs.map((blog) => (
              <Link
                href={`/blogs/${blog.id}`}
                key={blog.id}
                className="group flex"
              >
                <article className="flex flex-col w-full overflow-hidden rounded-[30px] bg-neutral-950 border border-white/10 hover:border-lime-400/30 transition-all duration-300">
                  {/* IMAGE */}
                  <div className="relative overflow-hidden h-60 bg-neutral-900">
                    <img
                      src={blog.coverImage ?? ""}
                      alt={blog.title}
                      className="w-full h-full object-cover brightness-[0.75] transition-transform duration-700 group-hover:scale-105 "
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    {blog.category && (
                      <div className="absolute top-4 left-4">
                        <span className="px-3 py-1.5 rounded-full bg-lime-400 text-black text-[10px] font-bold uppercase tracking-wider">
                          {blog.category.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* CONTENT */}
                  <div className="p-7 flex flex-col flex-1">
                    <h3 className="text-xl md:text-2xl font-black uppercase leading-tight text-white group-hover:text-lime-400 transition-colors duration-300 line-clamp-2">
                      {blog.title}
                    </h3>

                    <p className="mt-4 text-xs text-lime-400 font-bold uppercase tracking-[0.2em]">
                      {formatDate(blog.publishedAt)}
                    </p>

                    <p className="mt-5 text-neutral-400 leading-7 text-sm line-clamp-4 flex-1">
                      {blog.description}
                    </p>

                    <div className="mt-6 inline-flex items-center gap-2">
                      <span className="text-lime-400 font-bold text-sm uppercase tracking-wider border-b border-lime-400 pb-0.5">
                        Read More
                      </span>

                      <span className="text-lime-400 group-hover:translate-x-1 transition-transform">
                        →
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
