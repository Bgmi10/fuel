// app/api/upload/route.ts

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { randomUUID } from "crypto";

const s3 = new S3Client({
  region: process.env.S3_REGION!,
  credentials: {
    accessKeyId:
      process.env.S3_ACCESS_KEY!,
    secretAccessKey:
      process.env.S3_SECRET_KEY!,
  },
});

function sanitizeFileName(
  fileName: string
) {
  const lastDot =
    fileName.lastIndexOf(".");

  const rawName =
    lastDot > 0
      ? fileName.slice(0, lastDot)
      : fileName;

  const extension =
    lastDot > 0
      ? fileName.slice(lastDot)
      : "";

  const safeName = rawName
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  const safeExtension = extension
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "");

  return `${
    safeName || "file"
  }${safeExtension}`;
}

export async function POST(
  req: NextRequest
) {
  try {
    const bucket =
      process.env.S3_BUCKET_NAME;

    const region =
      process.env.S3_REGION;

    if (!bucket || !region) {
      console.error(
        "Missing S3_BUCKET_NAME or S3_REGION"
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "S3 configuration is missing.",
        },
        {
          status: 500,
        }
      );
    }

    const contentType =
      req.headers.get(
        "content-type"
      ) ?? "";

    let buffer: Buffer;
    let fileName: string;
    let mimeType: string;

    /*
     * --------------------------------
     * Multipart upload
     * Web
     * --------------------------------
     */
    if (
      contentType.includes(
        "multipart/form-data"
      )
    ) {
      const formData =
        await req.formData();

      const file =
        formData.get("file");

      if (
        !file ||
        !(file instanceof File)
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "No valid file uploaded.",
          },
          {
            status: 400,
          }
        );
      }

      if (file.size === 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Uploaded file is empty.",
          },
          {
            status: 400,
          }
        );
      }

      const bytes =
        await file.arrayBuffer();

      buffer =
        Buffer.from(bytes);

      mimeType =
        file.type ||
        "application/octet-stream";

      const safeOriginalName =
        sanitizeFileName(
          file.name
        );

      /*
       * UUID prevents collisions.
       *
       * Example:
       * workout-videos/
       * 5c4d...-jumping-jacks.mp4
       */
      fileName =
        `uploads/${randomUUID()}-${safeOriginalName}`;
    }

    /*
     * --------------------------------
     * Base64 upload
     * React Native
     * --------------------------------
     */
    else {
      const body =
        await req.json();

      if (
        !body.image ||
        typeof body.image !==
          "string"
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "No image provided.",
          },
          {
            status: 400,
          }
        );
      }

      const matches =
        body.image.match(
          /^data:([^;]+);base64,(.+)$/
        );

      if (!matches) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Invalid base64 file.",
          },
          {
            status: 400,
          }
        );
      }

      mimeType =
        matches[1] ||
        "application/octet-stream";

      buffer = Buffer.from(
        matches[2],
        "base64"
      );

      let extension =
        mimeType
          .split("/")[1]
          ?.toLowerCase() ||
        "bin";

      /*
       * Handle MIME types such as:
       * image/jpeg
       */
      if (
        extension === "jpeg"
      ) {
        extension = "jpg";
      }

      extension =
        extension.replace(
          /[^a-z0-9]/g,
          ""
        );

      fileName =
        `uploads/${randomUUID()}.${extension}`;
    }

    /*
     * --------------------------------
     * Upload to S3
     * --------------------------------
     */
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: fileName,
        Body: buffer,
        ContentType: mimeType,
      })
    );

    /*
     * Encode individual key segments.
     *
     * Don't encode the "/" because we
     * want to preserve S3 folders.
     */
    const encodedKey =
      fileName
        .split("/")
        .map((part) =>
          encodeURIComponent(
            part
          )
        )
        .join("/");

    const url =
      `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;

    console.log(
      "S3 upload successful:",
      {
        fileName,
        mimeType,
        size: buffer.length,
        url,
      }
    );

    return NextResponse.json({
      success: true,
      url,
      key: fileName,
    });
  } catch (error) {
    console.error(
      "S3 upload error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Upload failed.",
      },
      { 
        status: 500,
      }
    );
  }
}