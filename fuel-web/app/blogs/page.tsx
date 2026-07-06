    import { prisma } from "@/prisma";
    import BlogsPageClient from "./BlogsPageClient";

    export default async function Page() {

        const blogs = await prisma.blog.findMany({
        where: {
        status: "PUBLISHED",
        },

        include: {
        category: true,
        },

        orderBy: {
        publishedAt: "desc",
        },
    });

    const categories =
        await prisma.blogCategory.findMany({
        orderBy: {
            name: "asc",
        },
        });

    return (
        <>
        <BlogsPageClient
        blogs={blogs}
        categories={categories}
        />
        </>
    );
    }