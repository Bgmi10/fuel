
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

const Page = () => {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);

  const [name, setName] = useState("");

  const [loading, setLoading] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/blogs/category");

      const data = await res.json();

      setCategories(data.cat || []);
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = async () => {
    if (!name) return;

    setLoading(true);

    try {
      const res = await fetch("/api/blogs/category", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setName("");

        fetchCategories();
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = confirm(
      "Delete this category?"
    );

    if (!confirmDelete) return;

    try {
      await fetch(`/api/blogs/category/${id}`, {
        method: "DELETE",
      });

      fetchCategories();
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="text-neutral-400 hover:text-white mb-3"
          >
            ← Back
          </button>

          <h1 className="text-3xl font-bold text-white">
            Blog Categories
          </h1>

          <p className="text-neutral-400 text-sm mt-1">
            Organize blog posts by categories.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[380px_1fr] gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 h-fit space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Create Category
            </h2>

            <p className="text-neutral-500 text-sm mt-1">
              Add new blog category.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-neutral-400 block mb-2">
                Category Name
              </label>

              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);

                }}
                placeholder="Weight Loss"
                className="w-full bg-black border border-neutral-800 rounded-xl p-3 text-white"
              />
            </div>  

            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-lime-400 text-black font-semibold"
            >
              {loading
                ? "Creating..."
                : "Create Category"}
            </button>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Categories
              </h2>

              <p className="text-sm text-neutral-500 mt-1">
                Total {categories.length} categories
              </p>
            </div>
          </div>

          {categories.length === 0 ? (
            <div className="p-10 text-center text-neutral-500">
              No categories found.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-800 text-neutral-500">
                <tr>
                  <th className="text-left p-4">
                    Name
                  </th>

                  <th className="text-left">
                    Created
                  </th>

                  <th className="text-right pr-4">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {categories.map((category) => (
                  <tr
                    key={category.id}
                    className="border-b border-neutral-800"
                  >
                    <td className="p-4 text-white font-medium">
                      {category.name}
                    </td>

                    <td className="text-neutral-500 text-xs">
                      {new Date(
                        category.createdAt
                      ).toLocaleDateString()}
                    </td>

                    <td className="text-right pr-4">
                      <button
                        onClick={() =>
                          handleDelete(category.id)
                        }
                        className="px-3 py-1 rounded-lg bg-red-500/10 text-red-400 text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Page;
