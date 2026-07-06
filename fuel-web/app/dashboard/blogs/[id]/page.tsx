"use client";

import {
  useRef,
  useState,
  useEffect,
} from "react";

import {
  useRouter,
  useParams,
} from "next/navigation";

import BlogEditor from "../create/BlogEditor";

type Category = {
  id: string;
  name: string;
};

type Faq = {
  id?: string;
  question: string;
  answer: string;
};

export default function Page() {
  const editorRef = useRef<any>(null);

  const router = useRouter();

  const params = useParams();

  const id = params.id as string;

  const [title, setTitle] = useState("");

  const [description, setDescription] =
    useState("");

  const [coverImage, setCoverImage] =
    useState("");

  const [status, setStatus] =
    useState("DRAFT");

  const [publishedAt, setPublishedAt] =
    useState("");

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [categoryId, setCategoryId] =
    useState("");

  const [faqs, setFaqs] = useState<Faq[]>(
    []
  );

  const [editorData, setEditorData] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(false);

  const [pageLoading, setPageLoading] =
    useState(true);

  const [uploading, setUploading] =
    useState(false);

  useEffect(() => {
    if (id) {
      fetchCategories();
      fetchBlog();
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(
        "/api/blogs/category"
      );

      const data = await res.json();

      setCategories(data.cat || []);
    } catch (e) {
      console.log(e);
    }
  };

  const fetchBlog = async () => {
    try {
      const res = await fetch(
        `/api/blogs/${id}`
      );

      const data = await res.json();

      const blog = data.blog;

      setTitle(blog.title || "");

      setDescription(
        blog.description || ""
      );

      setCoverImage(
        blog.coverImage || ""
      );

      setStatus(blog.status);

      setCategoryId(
        blog.categoryId || ""
      );

      setEditorData(blog.content);

      setFaqs(blog.faqs || []);

      if (blog.publishedAt) {
        const date = new Date(
          blog.publishedAt
        );

        const formatted =
          date.toISOString().slice(0, 16);

        setPublishedAt(formatted);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setPageLoading(false);
    }
  };

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();

      formData.append("file", file);

      const res = await fetch(
        "/api/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();

      setCoverImage(data.url);
    } catch (e) {
      console.log(e);
    } finally {
      setUploading(false);
    }
  };

  const addFaq = () => {
    setFaqs([
      ...faqs,
      {
        question: "",
        answer: "",
      },
    ]);
  };

  const updateFaq = (
    index: number,
    field: "question" | "answer",
    value: string
  ) => {
    const updated = [...faqs];

    updated[index][field] = value;

    setFaqs(updated);
  };

  const removeFaq = (index: number) => {
    const updated = faqs.filter(
      (_, i) => i !== index
    );

    setFaqs(updated);
  };

  const handleSubmit = async () => {
    if (!editorRef.current) return;

    setLoading(true);

    try {
      const content =
        await editorRef.current.save();

      const filteredFaqs = faqs.filter(
        (f) =>
          f.question.trim() &&
          f.answer.trim()
      );

      const res = await fetch(
        `/api/blogs/${id}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            title,
            description,
            coverImage,
            content,
            status,
            publishedAt:
              publishedAt || null,
            categoryId:
              categoryId || null,
            faqs: filteredFaqs,
          }),
        }
      );

      const data = await res.json();

      router.push("/dashboard/blogs");
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="p-6 text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* SAME UI */}

      {/* CHANGE HEADER */}

      <div className="flex items-center justify-between">

        <div className="flex items-center gap-4">

          <button
            onClick={() =>
              router.back()
            }
            className="h-10 w-10 rounded-xl bg-neutral-900 border border-neutral-800 text-white"
          >
            ←
          </button>

          <div>
            <h1 className="text-2xl font-bold text-white">
              Edit Blog
            </h1>

            <p className="text-sm text-neutral-500">
              Update blog content
            </p>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-5 py-3 bg-lime-400 text-black rounded-xl font-semibold"
        >
          {loading
            ? "Updating..."
            : "Update Blog"}
        </button>
      </div>

      {/* KEEP YOUR ENTIRE FORM SAME */}
      <div className="space-y-5">

        {/* TITLE */}
        <div className="space-y-2">
          <label className="text-sm text-neutral-400">
            Blog Title
          </label>

          <input
            placeholder="Enter blog title"
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-white outline-none focus:border-lime-400"
          />
        </div>

        {/* DESCRIPTION */}
        <div className="space-y-2">

          <div className="flex items-center justify-between">
            <label className="text-sm text-neutral-400">
              Description
            </label>

            <p className="text-xs text-neutral-500">
              {description.length}/160
            </p>
          </div>

          <textarea
            placeholder="Write short blog description..."
            value={description}
            onChange={(e) =>
              setDescription(
                e.target.value
              )
            }
            rows={4}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-white outline-none resize-none focus:border-lime-400"
          />

          <p className="text-xs text-neutral-500">
            Used for SEO, previews and
            blog cards
          </p>
        </div>

        {/* CATEGORY + STATUS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* CATEGORY */}
          <div className="space-y-2">
            <label className="text-sm text-neutral-400">
              Category
            </label>

            <select
              value={categoryId}
              onChange={(e) =>
                setCategoryId(
                  e.target.value
                )
              }
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-white outline-none"
            >
              <option value="">
                Select category
              </option>

              {categories.map((cat) => (
                <option
                  key={cat.id}
                  value={cat.id}
                >
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* STATUS */}
          <div className="space-y-2">
            <label className="text-sm text-neutral-400">
              Status
            </label>

            <select
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value
                )
              }
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-white outline-none"
            >
              <option value="DRAFT">
                Draft
              </option>

              <option value="PUBLISHED">
                Published
              </option>
            </select>
          </div>
        </div>

        {/* PUBLISHED DATE */}
        <div className="space-y-2">
          <label className="text-sm text-neutral-400">
            Published At
          </label>

          <input
            type="datetime-local"
            value={publishedAt}
            onChange={(e) =>
              setPublishedAt(
                e.target.value
              )
            }
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-white outline-none focus:border-lime-400 [color-scheme:dark] appearance-none cursor-pointer"
          />
        </div>

        {/* COVER IMAGE */}
        <div className="space-y-3">

          <label className="text-sm text-neutral-400">
            Cover Image
          </label>

          <label
            className="relative flex flex-col items-center justify-center w-full h-72 border-2 border-dashed border-neutral-700 rounded-2xl bg-neutral-900 hover:border-lime-400 transition cursor-pointer overflow-hidden"
          >
            <input
              type="file"
              className="hidden"
              onChange={handleUpload}
            />

            {!coverImage ? (
              <div className="flex flex-col items-center gap-3 text-center px-6">

                <div className="h-16 w-16 rounded-full bg-neutral-800 flex items-center justify-center text-3xl">
                  🖼️
                </div>

                <div>
                  <p className="text-white font-medium">
                    Upload Cover Image
                  </p>

                  <p className="text-sm text-neutral-500 mt-1">
                    PNG, JPG, WEBP
                  </p>
                </div>

                {uploading && (
                  <p className="text-lime-400 text-sm">
                    Uploading...
                  </p>
                )}
              </div>
            ) : (
              <>
                <img
                  src={coverImage}
                  alt="Cover"
                  className="absolute inset-0 w-full h-full object-cover"
                />

                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition flex items-center justify-center">
                  <span className="px-4 py-2 bg-white text-black rounded-xl text-sm font-semibold">
                    Change Image
                  </span>
                </div>
              </>
            )}
          </label>
        </div>


        {/* FAQ */}
        <div className="space-y-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-5">

          <div className="flex items-center justify-between">

            <h2 className="text-lg font-semibold text-white">
              FAQs
            </h2>

            <button
              onClick={addFaq}
              className="px-4 py-2 bg-lime-400 text-black rounded-lg text-sm font-semibold"
            >
              Add FAQ
            </button>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border border-neutral-800 rounded-xl p-4 space-y-3"
              >

                <div className="flex items-center justify-between">

                  <p className="text-sm text-neutral-400">
                    FAQ #{index + 1}
                  </p>

                  <button
                    onClick={() =>
                      removeFaq(index)
                    }
                    className="text-red-400 text-sm"
                  >
                    Remove
                  </button>
                </div>

                <input
                  placeholder="Question"
                  value={faq.question}
                  onChange={(e) =>
                    updateFaq(
                      index,
                      "question",
                      e.target.value
                    )
                  }
                  className="w-full bg-black/30 border border-neutral-800 rounded-lg p-3 text-white outline-none"
                />

                <textarea
                  placeholder="Answer"
                  value={faq.answer}
                  onChange={(e) =>
                    updateFaq(
                      index,
                      "answer",
                      e.target.value
                    )
                  }
                  rows={4}
                  className="w-full bg-black/30 border border-neutral-800 rounded-lg p-3 text-white outline-none resize-none"
                />
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ONLY CHANGE THIS */}

      <BlogEditor
        editorRef={editorRef}
        initialData={editorData}
      />

    </div>
  );
}