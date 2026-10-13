
import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

type ScheduleSubLabel = {
  label: string;
  times: string[];
};

type NormalizedSchedule = {
  label: string;
  times: ScheduleSubLabel[];
  sortOrder: number;
};

type ScheduleInput = {
  label?: unknown;
  times?: unknown;
  sortOrder?: unknown;
};

/* =========================
   HELPERS
========================= */

function normalizeSchedule(
  schedule: unknown,
  index: number
): NormalizedSchedule | null {
  if (
    !schedule ||
    typeof schedule !== "object" ||
    Array.isArray(schedule)
  ) {
    return null;
  }

  const item = schedule as ScheduleInput;

  const label =
    typeof item.label === "string"
      ? item.label.trim()
      : "";

  if (!label || !Array.isArray(item.times)) {
    return null;
  }

  let normalizedTimes: ScheduleSubLabel[];

  // Support the legacy format:
  // ["6:00 AM", "7:00 AM"]
  if (
    item.times.every(
      (entry: unknown) => typeof entry === "string"
    )
  ) {
    const legacyTimes = item.times
      .filter(
        (time: unknown): time is string =>
          typeof time === "string"
      )
      .map((time: string) => time.trim())
      .filter(Boolean);

    normalizedTimes =
      legacyTimes.length > 0
        ? [{ label: "", times: legacyTimes }]
        : [];
  } else {
    // New format:
    // [{ label: "Morning", times: ["6:00 AM"] }]
    normalizedTimes = item.times
      .map((entry: unknown): ScheduleSubLabel | null => {
        if (
          !entry ||
          typeof entry !== "object" ||
          Array.isArray(entry)
        ) {
          return null;
        }

        const subLabel = entry as {
          label?: unknown;
          times?: unknown;
        };

        const subLabelText =
          typeof subLabel.label === "string"
            ? subLabel.label.trim()
            : "";

        const timeValues = Array.isArray(subLabel.times)
          ? subLabel.times
              .filter(
                (time: unknown): time is string =>
                  typeof time === "string"
              )
              .map((time: string) => time.trim())
              .filter(Boolean)
          : [];

        if (!subLabelText || timeValues.length === 0) {
          return null;
        }

        return {
          label: subLabelText,
          times: timeValues,
        };
      })
      .filter(
        (entry): entry is ScheduleSubLabel =>
          entry !== null
      );
  }

  if (normalizedTimes.length === 0) {
    return null;
  }

  return {
    label,
    times: normalizedTimes,
    sortOrder:
      typeof item.sortOrder === "number" &&
      Number.isFinite(item.sortOrder)
        ? item.sortOrder
        : index,
  };
}

/* =========================
   GET SERVICE CONTENT
========================= */

export async function GET(
  _req: NextRequest,
  { params }: Params
) {
  const { id: serviceId } = await params;

  try {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: {
        id: true,
        name: true,
        thumbnailImage: true,
        coverImage: true,
        websiteContent: {
          include: {
            schedules: {
              orderBy: { sortOrder: "asc" },
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

    const content = service.websiteContent;

    return NextResponse.json({
      success: true,
      service: {
        id: service.id,
        name: service.name,
        thumbnailImage: service.thumbnailImage,
        coverImage: service.coverImage,
      },
      content: content
        ? {
            ...content,
            schedules: content.schedules.map((schedule) => ({
              id: schedule.id,
              websiteContentId: schedule.websiteContentId,
              subCategoryId: schedule.subCategoryId,
              label: schedule.label,
              // Keep the JSON structure intact.
              times: schedule.times,
              sortOrder: schedule.sortOrder,
            })),
          }
        : null,
    });
  } catch (error) {
    console.error("Fetch service content error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch service content.",
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
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true },
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

    const body = await req.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : null;

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : null;

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
      body.intro !== undefined ? body.intro : null;

    const benefits =
      body.benefits !== undefined ? body.benefits : null;

    const idealFor =
      body.idealFor !== undefined ? body.idealFor : null;

    /* =========================
       NORMALIZE SCHEDULES
    ========================= */

    const schedules: NormalizedSchedule[] =
      Array.isArray(body.schedules)
        ? body.schedules
            .map((schedule: unknown, index: number) =>
              normalizeSchedule(schedule, index)
            )
            .filter(
              (
                schedule: any
              ): schedule is NormalizedSchedule =>
                schedule !== null
            )
        : [];

    /* =========================
       SAVE CONTENT + SCHEDULES
    ========================= */

    const content = await prisma.$transaction(async (tx) => {
      const websiteContent =
        await tx.serviceWebsiteContent.upsert({
          where: { serviceId },
          create: {
            serviceId,
            title,
            description,
            eyebrow,
            heroTitle,
            intro,
            closing,
            tagline,
            benefits,
            idealFor,
          },
          update: {
            title,
            description,
            eyebrow,
            heroTitle,
            intro,
            closing,
            tagline,
            benefits,
            idealFor,
          },
        });

      // Delete only website-level schedules for this service.
      // Subcategory schedules remain untouched.
      await tx.serviceSchedule.deleteMany({
        where: {
          websiteContentId: websiteContent.id,
        },
      });

      if (schedules.length > 0) {
        await tx.serviceSchedule.createMany({
          data: schedules.map((schedule) => ({
            websiteContentId: websiteContent.id,
            subCategoryId: null,
            label: schedule.label,

            // Store nested JSON objects, not String(object).
            times: schedule.times,

            sortOrder: schedule.sortOrder,
          })),
        });
      }

      return tx.serviceWebsiteContent.findUnique({
        where: { id: websiteContent.id },
        include: {
          schedules: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      content,
    });
  } catch (error) {
    console.error("Save service content error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to save service content.",
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
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true },
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

    // The schema's cascade deletes its website-level schedules.
    await prisma.serviceWebsiteContent.deleteMany({
      where: { serviceId },
    });

    return NextResponse.json({
      success: true,
      message: "Service content deleted successfully.",
    });
  } catch (error) {
    console.error("Delete service content error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete service content.",
      },
      { status: 500 }
    );
  }
}
