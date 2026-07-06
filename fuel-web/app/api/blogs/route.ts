import { prisma } from "@/prisma";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const blogs = await prisma.blog.findMany({
      include: {
        category: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return Response.json({
      success: true,
      blogs,
    });
  } catch (e) {
    console.log(e);

    return Response.json(
      {
        success: false,
        message: "Failed to fetch blogs",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      title,
      description,
      coverImage,
      content,
      categoryId,
      faqs,
      status,
    } = body;

    const blog = await prisma.blog.create({
      data: {
        title,
        coverImage,
        content,
        status,
        description,
        publishedAt:
          status === "PUBLISHED"
            ? new Date()
            : null,

        categoryId,

        faqs: {
          create:
            faqs?.map(
              (
                faq: {
                  question: string;
                  answer: string;
                },
              ) => ({
                question: faq.question,
                answer: faq.answer,
              })
            ) || [],
        },
      },
    });

    return Response.json({
      success: true,
      blog,
    });
  } catch (e) {
    console.log(e);

    return Response.json(
      {
        success: false,
        message: "Failed to create blog",
      },
      {
        status: 500,
      }
    );
  }
}