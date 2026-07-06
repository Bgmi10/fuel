"use client";

import { useEffect, useId } from "react";

export default function BlogEditor({
  editorRef,
  initialData,
}: {
  editorRef: any;
  initialData?: any;
}) {
  const holderId = useId();

  useEffect(() => {
    let isMounted = true;

    const initEditor = async () => {
      const EditorJS = (
        await import("@editorjs/editorjs")
      ).default;

      const Header = (
        await import("@editorjs/header")
      ).default;

      const List = (
        await import("@editorjs/list")
      ).default;

      const Paragraph = (
        await import("@editorjs/paragraph")
      ).default;

      const Table = (
        await import("@editorjs/table")
      ).default;

      const Quote = (
        await import("@editorjs/quote")
      ).default;

      const Delimiter = (
        await import("@editorjs/delimiter")
      ).default;

      const ImageTool = (
        await import("@editorjs/image")
      ).default;

      if (
        !editorRef.current &&
        isMounted
      ) {
        const editor = new EditorJS({
          holder: holderId,

          placeholder:
            "Write your blog content here...",

          tools: {
            header: Header,

            paragraph: Paragraph,

            list: List,

            table: Table,

            quote: Quote,

            delimiter: Delimiter,

            image: {
              class: ImageTool,

              config: {
                uploader: {
                  async uploadByFile(
                    file: File
                  ) {
                    const formData =
                      new FormData();

                    formData.append(
                      "file",
                      file
                    );

                    const res =
                      await fetch(
                        "/api/upload",
                        {
                          method: "POST",
                          body: formData,
                        }
                      );

                    const data =
                      await res.json();

                    return {
                      success: 1,

                      file: {
                        url: data.url,
                      },
                    };
                  },
                },
              },
            },
          },

          data:
            initialData || {
              blocks: [],
            },
        });

        editorRef.current = editor;
      }
    };

    initEditor();

    return () => {
      isMounted = false;

      if (
        editorRef.current &&
        typeof editorRef.current.destroy ===
          "function"
      ) {
        editorRef.current.destroy();

        editorRef.current = null;
      }
    };
  }, []);

  return (
    <div className="bg-white rounded-xl p-5 text-black min-h-[500px]">
      <div id={holderId} />
    </div>
  );
}