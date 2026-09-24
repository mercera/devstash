import { randomUUID } from "node:crypto";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 storage for file and image items, through R2's S3-compatible
 * API.
 *
 * An uploaded object's key is `uploads/<userId>/<uuid>.<ext>`, and the item
 * stores its public URL (`R2_PUBLIC_URL` + key) in `fileUrl`. The key is
 * derived back from that URL whenever the object has to be read or deleted.
 *
 * The user id in the key is what makes a `fileUrl` checkable: the create
 * action accepts only a URL under the caller's own prefix, so no one can
 * attach — and by deleting the item, destroy — another user's object.
 *
 * Configuration is read per call, never at module load, for the same reason as
 * `src/lib/rate-limit.ts`: a module-scope client would be built while
 * `next build` collects page data.
 */

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** No trailing slash. */
  publicUrl: string;
}

function getR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/+$/, "");

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    return null;
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

function requireR2Config(): R2Config {
  const config = getR2Config();

  if (config === null) {
    throw new Error("Cloudflare R2 is not configured. Set the R2_* variables.");
  }

  return config;
}

let cachedClient: { key: string; client: S3Client } | undefined;

/** One client per set of credentials, rebuilt if they change. */
function getClient(config: R2Config): S3Client {
  const key = [config.accountId, config.accessKeyId, config.secretAccessKey].join(
    "\u0000",
  );

  if (cachedClient?.key !== key) {
    cachedClient = {
      key,
      client: new S3Client({
        region: "auto",
        endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      }),
    };
  }

  return cachedClient.client;
}

function userPrefix(userId: string): string {
  return `uploads/${userId}/`;
}

/** A fresh, unguessable key under the user's prefix. */
export function createUploadKey(userId: string, extension: string): string {
  return `${userPrefix(userId)}${randomUUID()}.${extension}`;
}

/**
 * The object key behind a stored `fileUrl`, or null when the URL is not one of
 * `userId`'s uploads in this bucket.
 *
 * Only a plain key is accepted after the prefix — one path segment of the
 * shape `createUploadKey` produces — so `..` or a nested path cannot step out
 * of the user's prefix.
 */
export function getOwnedUploadKey(fileUrl: string, userId: string): string | null {
  const config = getR2Config();

  if (config === null) return null;

  const base = `${config.publicUrl}/`;

  if (!fileUrl.startsWith(base)) return null;

  const key = fileUrl.slice(base.length);
  const prefix = userPrefix(userId);

  if (!key.startsWith(prefix)) return null;

  return /^[A-Za-z0-9-]+\.[a-z0-9]+$/.test(key.slice(prefix.length)) ? key : null;
}

/** Stores an object and returns its public URL. */
export async function putUpload(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<string> {
  const config = requireR2Config();

  await getClient(config).send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  return `${config.publicUrl}/${key}`;
}

export interface UploadObject {
  body: ReadableStream;
  contentType: string | undefined;
  contentLength: number | undefined;
}

/** Reads an object, or returns null when it does not exist. */
export async function getUpload(key: string): Promise<UploadObject | null> {
  const config = requireR2Config();

  try {
    const result = await getClient(config).send(
      new GetObjectCommand({ Bucket: config.bucket, Key: key }),
    );

    if (!result.Body) return null;

    return {
      body: result.Body.transformToWebStream(),
      contentType: result.ContentType,
      contentLength: result.ContentLength,
    };
  } catch (error) {
    if (error instanceof NoSuchKey) return null;

    throw error;
  }
}

/** Deletes an object. Deleting one that is already gone is not an error. */
export async function deleteUpload(key: string): Promise<void> {
  const config = requireR2Config();

  await getClient(config).send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
  );
}
