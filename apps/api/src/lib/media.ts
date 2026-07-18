import { createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

function r2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET &&
      process.env.R2_PUBLIC_BASE_URL,
  );
}

function r2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export async function storeExerciseImage(
  sourceUrl: string,
  keyHint: string,
): Promise<string | null> {
  try {
    const response = await fetch(sourceUrl);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await response.arrayBuffer());
    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
        ? "webp"
        : contentType.includes("gif")
          ? "gif"
          : "jpg";
    const hash = createHash("sha1").update(buffer).digest("hex").slice(0, 12);
    const key = `exercises/${keyHint}-${hash}.${ext}`;

    if (r2Configured()) {
      const client = r2Client();
      await client.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET!,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );
      return `${process.env.R2_PUBLIC_BASE_URL!.replace(/\/$/, "")}/${key}`;
    }

    const mediaRoot = process.env.MEDIA_DIR || path.join(process.cwd(), "media");
    const dest = path.join(mediaRoot, key);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, buffer);
    const base = (process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT ?? 4000}`).replace(
      /\/$/,
      "",
    );
    return `${base}/media/${key}`;
  } catch (err) {
    console.warn("Failed to store exercise image", sourceUrl, err);
    return null;
  }
}
