import { prisma } from "@/prisma";

type Input = {
  serviceId: string;
  subCategoryId: unknown;
  days: unknown;
  sellingPrice: unknown;
  originalPrice: unknown;
  excludeId?: string;
};

export async function validateTrial(input: Input) {
  const days = Number(input.days);
  const sellingPrice = Number(input.sellingPrice);

  const subCategoryId =
    typeof input.subCategoryId === "string" && input.subCategoryId
      ? input.subCategoryId
      : null;

  const originalPrice =
    input.originalPrice === null ||
    input.originalPrice === undefined ||
    input.originalPrice === ""
      ? null
      : Number(input.originalPrice);

  if (!Number.isInteger(days) || days < 1) {
    return { error: "Days must be a whole number of at least 1" };
  }

  if (!Number.isInteger(sellingPrice) || sellingPrice < 0) {
    return { error: "Selling price must be 0 or more" };
  }

  if (originalPrice !== null) {
    if (!Number.isInteger(originalPrice) || originalPrice < 0) {
      return { error: "Original price is invalid" };
    }
    if (originalPrice < sellingPrice) {
      return {
        error: "Original price cannot be lower than the selling price",
      };
    }
  }

  if (subCategoryId) {
    const subCategory = await prisma.serviceSubCategory.findFirst({
      where: { id: subCategoryId, serviceId: input.serviceId },
      select: { id: true },
    });

    if (!subCategory) {
      return { error: "Subcategory does not belong to this service" };
    }
  }

  // Postgres treats NULLs as distinct in unique indexes,
  // so duplicates must be checked here as well.
  const duplicate = await prisma.serviceTrial.findFirst({
    where: {
      serviceId: input.serviceId,
      subCategoryId,
      days,
      ...(input.excludeId ? { NOT: { id: input.excludeId } } : {}),
    },
    select: { id: true },
  });

  if (duplicate) {
    return {
      error: `A ${days}-day trial already exists for this selection`,
    };
  }

  return {
    data: { subCategoryId, days, sellingPrice, originalPrice },
  };
}