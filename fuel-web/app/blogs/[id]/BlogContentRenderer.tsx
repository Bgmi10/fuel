"use client";

// Renders Editor.js JSON content for a Fuel Gym blog post.
// Covers the tools registered in BlogEditor: header, paragraph, list, table,
// quote, delimiter, image.
//
// Inline marks (bold, italic, links) come through as HTML inside `text` fields,
// so we use dangerouslySetInnerHTML on those. Content is admin-authored — if you
// open authoring to less-trusted users, sanitize with DOMPurify first.

import { JSX } from "react";

type EditorBlock = {
  type: string;
  data: any;
};

type EditorData = {
  blocks?: EditorBlock[];
  time?: number;
  version?: string;
};

export default function BlogContentRenderer({
  data,
}: {
  data: EditorData | null | undefined;
}) {
  if (!data?.blocks?.length) {
    return (
      <p className="text-[#D3D3D3]/50 italic text-center py-10">
        No content yet.
      </p>
    );
  }

  return (
    <div className="space-y-7">
      {data.blocks.map((block, i) => (
        <BlockRenderer key={i} block={block} />
      ))}
    </div>
  );
}

function BlockRenderer({ block }: { block: EditorBlock }) {
  switch (block.type) {
    case "header":
      return <HeaderBlock data={block.data} />;
    case "paragraph":
      return <ParagraphBlock data={block.data} />;
    case "list":
      return <ListBlock data={block.data} />;
    case "table":
      return <TableBlock data={block.data} />;
    case "quote":
      return <QuoteBlock data={block.data} />;
    case "delimiter":
      return <DelimiterBlock />;
    case "image":
      return <ImageBlock data={block.data} />;
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────
// HEADER
// ─────────────────────────────────────────────────────────────
function HeaderBlock({ data }: { data: { text: string; level?: number } }) {
  const level = Math.min(Math.max(data.level ?? 2, 1), 6);
  const sizes: Record<number, string> = {
    1: "text-4xl md:text-5xl mt-8",
    2: "text-3xl md:text-4xl mt-7",
    3: "text-2xl md:text-3xl mt-6",
    4: "text-xl md:text-2xl mt-5",
    5: "text-lg md:text-xl mt-4",
    6: "text-base md:text-lg mt-3",
  };
  const cls = `font-['Boxing'] text-white tracking-tight leading-[1.15] ${sizes[level]}`;
  const props = {
    className: cls,
    dangerouslySetInnerHTML: { __html: data.text || "" },
  };

  // Dynamic header levels — switch is safer than dynamic JSX tag in strict TS.
  switch (level) {
    case 1: return <h1 {...props} />;
    case 2: return <h2 {...props} />;
    case 3: return <h3 {...props} />;
    case 4: return <h4 {...props} />;
    case 5: return <h5 {...props} />;
    case 6: return <h6 {...props} />;
    default: return <h2 {...props} />;
  }
}

// ─────────────────────────────────────────────────────────────
// PARAGRAPH
// ─────────────────────────────────────────────────────────────
function ParagraphBlock({
  data,
}: {
  data: { text: string; alignment?: "left" | "center" | "right" };
}) {
  const align =
    data.alignment === "center"
      ? "text-center"
      : data.alignment === "right"
      ? "text-right"
      : "text-left";

  return (
    <p
      className={`text-[#D3D3D3] text-base md:text-[17px] leading-[1.85] ${align} [&_a]:text-[#BBF000] [&_a]:underline [&_a]:underline-offset-4 [&_a]:decoration-[#BBF000]/40 hover:[&_a]:decoration-[#BBF000] [&_b]:text-white [&_b]:font-semibold [&_strong]:text-white [&_strong]:font-semibold [&_code]:bg-[#272A2D] [&_code]:text-[#BBF000] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_mark]:bg-[#BBF000]/20 [&_mark]:text-[#BBF000] [&_mark]:px-1 [&_mark]:rounded`}
      dangerouslySetInnerHTML={{ __html: data.text || "" }}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// LIST  (handles both legacy strings and nested {content, items} format)
// ─────────────────────────────────────────────────────────────
type ListItem = string | { content: string; items?: ListItem[] };

function ListBlock({
  data,
}: {
  data: { style?: "ordered" | "unordered"; items?: ListItem[] };
}) {
  if (!data.items?.length) return null;
  return renderList(data.items, data.style ?? "unordered", 0);
}

function renderList(
  items: ListItem[],
  style: "ordered" | "unordered",
  depth: number
): JSX.Element {
  const baseCls =
    "space-y-2 pl-6 marker:text-[#BBF000] marker:font-bold text-[#D3D3D3] leading-relaxed [&_a]:text-[#BBF000] [&_a]:underline [&_b]:text-white [&_strong]:text-white";
  const listCls = `${baseCls} ${
    style === "ordered" ? "list-decimal" : "list-disc"
  }`;

  const children = items.map((item, i) => {
    if (typeof item === "string") {
      return (
        <li
          key={i}
          className="pl-1"
          dangerouslySetInnerHTML={{ __html: item }}
        />
      );
    }
    return (
      <li key={i} className="pl-1">
        <span dangerouslySetInnerHTML={{ __html: item.content || "" }} />
        {item.items && item.items.length > 0 && (
          <div className="mt-2">
            {renderList(item.items, style, depth + 1)}
          </div>
        )}
      </li>
    );
  });

  return style === "ordered" ? (
    <ol className={listCls}>{children}</ol>
  ) : (
    <ul className={listCls}>{children}</ul>
  );
}

// ─────────────────────────────────────────────────────────────
// TABLE
// ─────────────────────────────────────────────────────────────
function TableBlock({
  data,
}: {
  data: { withHeadings?: boolean; content?: string[][] };
}) {
  if (!data.content?.length) return null;
  const withHeadings = !!data.withHeadings;
  const [headerRow, ...bodyRows] = withHeadings
    ? data.content
    : [[] as string[], ...data.content];

  return (
    <div className="overflow-x-auto rounded-xl border border-[#272A2D] my-2">
      <table className="w-full text-sm">
        {withHeadings && (
          <thead className="bg-[#1c1f20]">
            <tr>
              {headerRow.map((cell, i) => (
                <th
                  key={i}
                  className="px-4 py-3 text-left text-[#BBF000] font-semibold uppercase tracking-wider text-xs border-b border-[#272A2D]"
                  dangerouslySetInnerHTML={{ __html: cell }}
                />
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {bodyRows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-[#272A2D] last:border-0 hover:bg-[#272A2D]/30 transition-colors"
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="px-4 py-3 text-[#D3D3D3] align-top"
                  dangerouslySetInnerHTML={{ __html: cell }}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// QUOTE
// ─────────────────────────────────────────────────────────────
function QuoteBlock({
  data,
}: {
  data: { text: string; caption?: string; alignment?: string };
}) {
  return (
    <blockquote className="relative border-l-4 border-[#BBF000] bg-[#1c1f20]/50 pl-6 pr-6 py-5 my-3 rounded-r-lg">
      <span className="absolute -top-2 left-4 text-[#BBF000]/50 text-5xl font-['Boxing'] leading-none select-none">
        “
      </span>
      <p
        className="text-lg md:text-xl text-white leading-relaxed italic"
        dangerouslySetInnerHTML={{ __html: data.text || "" }}
      />
      {data.caption && (
        <footer
          className="mt-3 text-xs text-[#BBF000] not-italic uppercase tracking-[0.2em] font-semibold"
          dangerouslySetInnerHTML={{ __html: `— ${data.caption}` }}
        />
      )}
    </blockquote>
  );
}

// ─────────────────────────────────────────────────────────────
// DELIMITER
// ─────────────────────────────────────────────────────────────
function DelimiterBlock() {
  return (
    <div className="flex items-center justify-center gap-2 my-6 py-2">
      <div className="h-1.5 w-1.5 rounded-full bg-[#BBF000]" />
      <div className="h-1.5 w-1.5 rounded-full bg-[#BBF000]/60" />
      <div className="h-1.5 w-1.5 rounded-full bg-[#BBF000]/30" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// IMAGE
// ─────────────────────────────────────────────────────────────
function ImageBlock({
  data,
}: {
  data: {
    file?: { url?: string };
    caption?: string;
    withBorder?: boolean;
    withBackground?: boolean;
    stretched?: boolean;
  };
}) {
  const url = data.file?.url;
  if (!url) return null;

  return (
    <figure className={data.stretched ? "" : "max-w-3xl mx-auto"}>
      <div
        className={`overflow-hidden rounded-xl ${
          data.withBorder ? "border border-[#3D4042]" : ""
        } ${data.withBackground ? "bg-[#1c1f20] p-6" : ""}`}
      >
        <img
          src={url}
          alt={data.caption || ""}
          className="w-full h-auto object-cover rounded-lg"
        />
      </div>
      {data.caption && (
        <figcaption
          className="text-center mt-3 text-sm text-[#D3D3D3]/60 italic [&_a]:text-[#BBF000]"
          dangerouslySetInnerHTML={{ __html: data.caption }}
        />
      )}
    </figure>
  );
}