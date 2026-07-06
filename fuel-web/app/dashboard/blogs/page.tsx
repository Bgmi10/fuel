"use client";

import { Blog, BlogCategory } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type BlogwithCat = Blog & {
    category: BlogCategory
}

const Page = () => {
  const [blogs, setBlogs] = useState<BlogwithCat[]>([]);
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const fetchBlogs = async () => {
    try {
      const res = await fetch("/api/blogs");

      const data = await res.json();

      setBlogs(data.blogs || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  return (
    <div className="p-6">

      {/* HEADER */}

      <div className="flex items-center justify-between mb-6">

        <div>
          <h1 className="text-2xl font-bold text-white">
            Blogs
          </h1>

          <p className="text-sm text-neutral-400 mt-1">
            Manage all blogs
          </p>
        </div>
        <div className="flex gap-2 items-center"> 
        <button
            onClick={() =>
              router.push("/dashboard/blogs/category")
            }
            className="px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white hover:border-lime-400 transition"
          >
            Categories
          </button>


        <button className="bg-lime-400 text-black px-4 py-2 rounded-lg text-sm font-medium" onClick={() => {
            router.push('/dashboard/blogs/create')
        }}>
          + Create Blog
        </button>

        </div>
        
      </div>

      {/* TABLE */}

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">

        <table className="w-full text-sm">

          <thead className="border-b border-neutral-800 text-neutral-400">
            <tr>

              <th className="text-left p-4">
                Blog
              </th>

              <th className="text-left">
                Category
              </th>

              <th className="text-left">
                Status
              </th>

              <th className="text-left">
                Published
              </th>

              <th className="text-right pr-4">
                Actions
              </th>

            </tr>
          </thead>

          <tbody>

            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-6 text-center text-neutral-500"
                >
                  Loading...
                </td>
              </tr>
            ) : blogs.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-6 text-center text-neutral-500"
                >
                  No blogs found
                </td>
              </tr>
            ) : (
              blogs.map((blog) => (
                <tr
                  key={blog.id}
                  className="border-b border-neutral-800"
                >

                  {/* BLOG */}

                  <td className="p-4">

                    <div className="flex items-center gap-3">

                      {blog.coverImage ? (
                        <img
                          src={blog.coverImage}
                          className="w-16 h-14 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-14 bg-neutral-800 rounded-lg" />
                      )}

                      <div>

                        <p className="text-white font-medium">
                          {blog.title}
                        </p>

                      </div>

                    </div>

                  </td>

                  {/* CATEGORY */}

                  <td className="text-neutral-300">
                    {blog.category?.name || "-"}
                  </td>

                  {/* STATUS */}

                  <td>

                    <span
                      className={`text-xs px-2 py-1 rounded-md ${
                        blog.status === "PUBLISHED"
                          ? "bg-green-500/10 text-green-400"
                          : "bg-yellow-500/10 text-yellow-400"
                      }`}
                    >
                      {blog.status}
                    </span>

                  </td>

                  {/* DATE */}

                  <td className="text-neutral-400 text-xs">

                    {blog.publishedAt
                      ? new Date(
                          blog.publishedAt
                        ).toLocaleDateString()
                      : "-"}

                  </td>

                  {/* ACTIONS */}

                  <td>

                    <div className="flex justify-end gap-3 pr-4">

                      <button className="text-blue-400 text-xs" onClick={() => {
                        router.push(`/dashboard/blogs/${blog.id}`)
                      }}>
                        Edit
                      </button>

                      <button className="text-red-400 text-xs" onClick={async() => {
                        const res = await fetch(`/api/blogs/${blog.id}`, {
                            method: "DELETE",
                        });
                        if (res.ok) {
                            fetchBlogs();
                        }
                      }}>
                        Delete
                      </button>

                    </div>

                  </td>

                </tr>
              ))
            )}

          </tbody>

        </table>

      </div>

    </div>
  );
};

export default Page;