import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

type Params = {
    params: Promise<{
      id: string;
    }>;
  };
  

export const GET = async (req: NextRequest, { params }: Params) => {
    const { id }  = await params;

    try {
        const blog = await prisma.blog.findUnique({ where: { id  },
         include: {
            category: true,
            faqs: true
         }
        })
        return NextResponse.json({ success: true, blog })
    } catch (e) {
        return NextResponse.json({ success: false })
    }
}

export async function PATCH(
  req: NextRequest,
  { params }: Params
) {
  try {
    const { id } = await params;

    const body = await req.json();

    const {
      title,
      description,
      coverImage,
      content,
      status,
      publishedAt,
      categoryId,
      faqs,
    } = body;

    const existingBlog =
      await prisma.blog.findUnique({
        where: {
          id,
        },
      });

    if (!existingBlog) {
      return NextResponse.json(
        {
          success: false,
          message: "Blog not found",
        },
        {
          status: 404,
        }
      );
    }

    // remove old faqs
    await prisma.blogFaq.deleteMany({
      where: {
        blogId: id,
      },
    });

    // update blog
    const updatedBlog =
      await prisma.blog.update({
        where: {
          id,
        },

        data: {
          title,

          description,

          coverImage,

          content,

          status,

          publishedAt: publishedAt
            ? new Date(publishedAt)
            : null,

          categoryId,

          faqs: {
            create:
              faqs?.map(
                (
                  faq: any,
                ) => ({
                  question:
                    faq.question,

                  answer:
                    faq.answer,

                })
              ) || [],
          },
        },

        include: {
          category: true,

          faqs: true,
        },
      });

    return NextResponse.json({
      success: true,
      blog: updatedBlog,
    });
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update blog",
      },
      {
        status: 500,
      }
    );
  }
}

// DELETE BLOG
export async function DELETE(
  req: NextRequest,
  { params }: Params
) {
  try {
    const { id } = await params;

    await prisma.blog.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Blog deleted",
    });
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete blog",
      },
      {
        status: 500,
      }
    );
  }
}