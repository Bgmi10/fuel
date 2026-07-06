// app/api/upload/route.ts

import { NextRequest, NextResponse } from "next/server";

import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.S3_REGION!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
});

export async function POST(req: NextRequest) {
  try {
    const contentType =
      req.headers.get("content-type") ?? "";

    let buffer: Buffer;
    let fileName: string;
    let mimeType: string;

    /**
     * ------------------------------------
     * Multipart upload (Web)
     * ------------------------------------
     */
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();

      const file = formData.get("file") as
        | File
        | null;

      if (!file) {
        return NextResponse.json(
          {
            success: false,
            message: "No file uploaded",
          },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();

      buffer = Buffer.from(bytes);
      mimeType = file.type;
      fileName = `${Date.now()}-${file.name}`;
    }

    /**
     * ------------------------------------
     * Base64 upload (React Native)
     * ------------------------------------
     */
    else {
      const body = await req.json();

      if (!body.image) {
        return NextResponse.json(
          {
            success: false,
            message: "No image provided",
          },
          { status: 400 }
        );
      }

      const matches = body.image.match(
        /^data:(.+);base64,(.+)$/
      );

      if (!matches) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid base64 image",
          },
          { status: 400 }
        );
      }

      mimeType = matches[1];
      buffer = Buffer.from(matches[2], "base64");

      const extension =
        mimeType.split("/")[1] || "png";

      fileName = `${Date.now()}.${extension}`;
    }

    /**
     * ------------------------------------
     * Upload to S3
     * ------------------------------------
     */

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: fileName,
        Body: buffer,
        ContentType: mimeType,
      })
    );

    const url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.S3_REGION}.amazonaws.com/${fileName}`;

    return NextResponse.json({
      success: true,
      url,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Upload failed",
      },
      {
        status: 500,
      }
    );
  }
}