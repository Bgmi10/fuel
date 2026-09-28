import { prisma } from "@/prisma";

import {
  NextRequest,
  NextResponse,
} from "next/server";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

/* =========================
   GET SERVICE CONTENT
========================= */

export async function GET(
  _req: NextRequest,
  { params }: Params
) {
  const { id: serviceId } = await params;

  try {
    const service =
      await prisma.service.findUnique({
        where: {
          id: serviceId,
        },
        select: {
          id: true,
          name: true,
          thumbnailImage: true,
          coverImage: true,
          websiteContent: {
            include: {
              schedules: {
                orderBy: {
                  sortOrder: "asc",
                },
              },
            },
          },
        },
      });

    if (!service) {
      return NextResponse.json(
        {
          success: false,
          message: "Service not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,

      service: {
        id: service.id,
        name: service.name,
        thumbnailImage:
          service.thumbnailImage,
        coverImage:
          service.coverImage,
      },

      content:
        service.websiteContent,
    });
  } catch (error) {
    console.error(
      "Fetch service content error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to fetch service content.",
      },
      { status: 500 }
    );
  }
}

/* =========================
   CREATE / UPDATE SERVICE CONTENT
========================= */

export async function POST(
  req: NextRequest,
  { params }: Params
) {
  const { id: serviceId } = await params;

  try {
    /* =========================
       VERIFY SERVICE
    ========================= */

    const service =
      await prisma.service.findUnique({
        where: {
          id: serviceId,
        },
        select: {
          id: true,
        },
      });

    if (!service) {
      return NextResponse.json(
        {
          success: false,
          message: "Service not found.",
        },
        { status: 404 }
      );
    }

    /* =========================
       REQUEST BODY
    ========================= */

    const body = await req.json();

    /* =========================
       NEW FIELDS
    ========================= */

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : null;

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : null;

    /* =========================
       EXISTING FIELDS
    ========================= */

    const eyebrow =
      typeof body.eyebrow === "string"
        ? body.eyebrow.trim()
        : null;

    const heroTitle =
      typeof body.heroTitle === "string"
        ? body.heroTitle.trim()
        : null;

    const closing =
      typeof body.closing === "string"
        ? body.closing.trim()
        : null;

    const tagline =
      typeof body.tagline === "string"
        ? body.tagline.trim()
        : null;

    const intro =
      body.intro !== undefined
        ? body.intro
        : null;

    const benefits =
      body.benefits !== undefined
        ? body.benefits
        : null;

    const idealFor =
      body.idealFor !== undefined
        ? body.idealFor
        : null;

    /* =========================
       SCHEDULES
    ========================= */

    const schedules = Array.isArray(
      body.schedules
    )
      ? body.schedules
          .map(
            (
              schedule: unknown,
              index: number
            ) => {
              if (
                !schedule ||
                typeof schedule !==
                  "object"
              ) {
                return null;
              }

              const item =
                schedule as {
                  label?: unknown;
                  times?: unknown;
                  sortOrder?: unknown;
                };

              const label =
                typeof item.label ===
                "string"
                  ? item.label.trim()
                  : "";

              const times =
                Array.isArray(
                  item.times
                )
                  ? item.times
                      .map((time) =>
                        String(
                          time
                        ).trim()
                      )
                      .filter(Boolean)
                  : [];

              if (
                !label ||
                times.length === 0
              ) {
                return null;
              }

              return {
                label,
                times,
                sortOrder:
                  typeof item.sortOrder ===
                  "number"
                    ? item.sortOrder
                    : index,
              };
            }
          )
          .filter(
            (
              schedule: any
            ): schedule is {
              label: string;
              times: string[];
              sortOrder: number;
            } => schedule !== null
          )
      : [];

    /* =========================
       SAVE EVERYTHING
    ========================= */

    const content =
      await prisma.$transaction(
        async (tx) => {
          /*
           * First create/update the main
           * website content.
           */

          const websiteContent =
            await tx.serviceWebsiteContent.upsert(
              {
                where: {
                  serviceId,
                },

                create: {
                  serviceId,

                  // NEW
                  title,
                  description,

                  // EXISTING
                  eyebrow,
                  heroTitle,
                  intro,
                  closing,
                  tagline,
                  benefits,
                  idealFor,
                },

                update: {
                  // NEW
                  title,
                  description,

                  // EXISTING
                  eyebrow,
                  heroTitle,
                  intro,
                  closing,
                  tagline,
                  benefits,
                  idealFor,
                },
              }
            );

          /*
           * Replace only the schedules that
           * belong to this website content.
           *
           * This does NOT touch schedules
           * belonging to subcategories.
           */

          await tx.serviceSchedule.deleteMany(
            {
              where: {
                websiteContentId:
                  websiteContent.id,
              },
            }
          );

          /*
           * Create the new website-level
           * schedules.
           */

          if (schedules.length > 0) {
            await tx.serviceSchedule.createMany(
              {
                data: schedules.map(
                  (schedule: any) => ({
                    websiteContentId:
                      websiteContent.id,

                    subCategoryId:
                      null,

                    label:
                      schedule.label,

                    times:
                      schedule.times,

                    sortOrder:
                      schedule.sortOrder,
                  })
                ),
              }
            );
          }

          /*
           * Return the complete content
           * including schedules.
           */

          return tx.serviceWebsiteContent.findUnique(
            {
              where: {
                id: websiteContent.id,
              },

              include: {
                schedules: {
                  orderBy: {
                    sortOrder: "asc",
                  },
                },
              },
            }
          );
        }
      );

    return NextResponse.json({
      success: true,
      content,
    });
  } catch (error) {
    console.error(
      "Save service content error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to save service content.",
      },
      { status: 500 }
    );
  }
}

/* =========================
   DELETE SERVICE CONTENT
========================= */

export async function DELETE(
  _req: NextRequest,
  { params }: Params
) {
  const { id: serviceId } = await params;

  try {
    const service =
      await prisma.service.findUnique({
        where: {
          id: serviceId,
        },
        select: {
          id: true,
        },
      });

    if (!service) {
      return NextResponse.json(
        {
          success: false,
          message: "Service not found.",
        },
        { status: 404 }
      );
    }

    /*
     * ServiceWebsiteContent has
     * onDelete: Cascade for schedules,
     * so deleting the content also deletes
     * its website-level schedules.
     */

    await prisma.serviceWebsiteContent.deleteMany(
      {
        where: {
          serviceId,
        },
      }
    );

    return NextResponse.json({
      success: true,
      message:
        "Service content deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete service content error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to delete service content.",
      },
      { status: 500 }
    );
  }
}