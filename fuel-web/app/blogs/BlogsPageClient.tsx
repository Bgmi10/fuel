"use client";


import { Blog, BlogCategory } from "@prisma/client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Header } from "../components/Header";
import { ContactForm } from "../components/Contactus";

type BlogwithCat = Blog & {
    category: BlogCategory | null;
  };

export default function page({
  blogs,
  categories,
}: {
  blogs: BlogwithCat[];
  categories: BlogCategory[];
}) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isContactOpen, setIsContactOpen  ] = useState(false);


  const filteredBlogs = useMemo(() => {
    if (selectedCategory === "all") return blogs;
    return blogs.filter((blog) => blog.category?.id === selectedCategory);
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
    <div className="min-h-screen bg-[#151718] text-white font-['Clash_Grotesk']">
    <Header setIsContactOpen={setIsContactOpen} />

    <ContactForm open={isContactOpen} setOpen={setIsContactOpen} />

      {/* PAGE HEADER */}
      <section className="border-b border-[#272A2D]">
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-10 mt-10">
          <h1 className="font-['Boxing'] text-4xl md:text-5xl text-white tracking-tight">
            Blogs & Articles
          </h1>
          {/* CATEGORY PILLS */}
          <div className="mt-8 flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-5 py-2 rounded-full whitespace-nowrap border text-sm font-medium transition-all duration-200 ${
                selectedCategory === "all"
                  ? "bg-[#BBF000] text-[#151718] border-[#BBF000]"
                  : "bg-transparent border-[#3D4042] text-[#D3D3D3] hover:border-[#BBF000] hover:text-[#BBF000]"
              }`}
            >
              All Blogs
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-5 py-2 rounded-full whitespace-nowrap border text-sm font-medium transition-all duration-200 ${
                  selectedCategory === cat.id
                    ? "bg-[#BBF000] text-[#151718] border-[#BBF000]"
                    : "bg-transparent border-[#3D4042] text-[#D3D3D3] hover:border-[#BBF000] hover:text-[#BBF000]"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* BLOG GRID */}
      <section className="max-w-7xl mx-auto px-6 py-14">
        {filteredBlogs.length === 0 ? (
          <div className="border border-[#272A2D] rounded-2xl p-16 text-center bg-[#1c1f20]">
            <h3 className="font-['Boxing'] text-2xl text-white">
              No blogs found
            </h3>
            <p className="text-[#D3D3D3]/70 mt-3">
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
                <article className="flex flex-col w-full overflow-hidden rounded-2xl bg-[#1c1f20] border border-[#272A2D] hover:border-[#BBF000]/40 transition-all duration-300">
                  {/* IMAGE */}
                  <div className="relative overflow-hidden h-60 bg-[#272A2D]">
                    <img
                      src={blog.coverImage ?? ""}
                      alt={blog.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    {blog.category && (
                      <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 rounded-full bg-[#BBF000] text-[#151718] text-[10px] font-bold uppercase tracking-wider">
                          {blog.category.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* CONTENT */}
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="text-xl font-semibold leading-snug text-white group-hover:text-[#BBF000] transition-colors duration-300 line-clamp-2">
                      {blog.title}
                    </h3>

                    <p className="mt-3 text-xs text-[#D3D3D3]/60 font-medium uppercase tracking-wider">
                      {formatDate(blog.publishedAt)}
                    </p>

                    <p className="mt-4 text-[#D3D3D3]/80 leading-relaxed text-sm line-clamp-4 flex-1">
                      {blog.description}
                    </p>

                    <div className="mt-5 inline-flex items-center gap-1.5">
                      <span className="text-[#BBF000] font-semibold text-sm border-b border-[#BBF000] pb-0.5">
                        read more
                      </span>
                      <span className="text-[#BBF000] group-hover:translate-x-1 transition-transform">
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
    </div>
  );
}