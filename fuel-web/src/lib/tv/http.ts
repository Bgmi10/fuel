import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { formatZodError } from "./contracts";
import { HttpError } from "./errors";
import { PlanError } from "./plan";

/** Success: { data }. Failure: { error, issues? }. No other shapes. */
export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export async function readBody<S extends z.ZodTypeAny>(
  req: Request,
  schema: S
): Promise<z.output<S>> {
  let raw: unknown;

  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }

  return schema.parse(raw);
}

export function readQuery<S extends z.ZodTypeAny>(
  req: Request,
  schema: S
): z.output<S> {
  return schema.parse(Object.fromEntries(new URL(req.url).searchParams));
}

export function handleError(error: unknown, label: string) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(formatZodError(error), { status: 400 });
  }

  if (error instanceof PlanError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }
    if (error.code === "P2003") {
      return NextResponse.json(
        { error: "This item is still used by other records." },
        { status: 409 }
      );
    }
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A record with these details already exists." },
        { status: 409 }
      );
    }
  }

  console.error(label, error);

  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

export type IdParams = { params: Promise<{ id: string }> };
