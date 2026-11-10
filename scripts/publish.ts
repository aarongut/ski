import { createReadStream } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

import {
  CloudFrontClient,
  CreateInvalidationCommand,
  GetDistributionConfigCommand,
  UpdateDistributionCommand,
} from "@aws-sdk/client-cloudfront";
import { ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { fromIni } from "@aws-sdk/credential-providers";
import mime from "mime-types";

import { allDerivedPaths, originalPath } from "../src/lib/images.ts";

const BUCKET = "ski.aarongutierrez.com";
const DISTRIBUTION = "ELFNI2LSHJUNK";
const DIST_DIR = "dist";
const IMAGE_DIR = "img";
const AWS_PROFILE = "push";
const AWS_REGION = "us-west-2";
const DATA_FILE = "data.json";

const credentials = fromIni({ profile: AWS_PROFILE });

const s3 = new S3Client({ credentials, region: AWS_REGION });
const cloudfront = new CloudFrontClient({ credentials, region: AWS_REGION });

let existingKeysPromise: Promise<Set<string>> | null = null;

const currentKeys = async (): Promise<Set<string>> => {
  if (existingKeysPromise) {
    return existingKeysPromise;
  }

  existingKeysPromise = (async () => {
    console.log(`Fetching existing keys in ${BUCKET}`);
    const keys = new Set<string>();
    let continuationToken: string | undefined;

    do {
      const response = await s3.send(
        new ListObjectsV2Command({
          Bucket: BUCKET,
          ContinuationToken: continuationToken,
        }),
      );

      for (const content of response.Contents ?? []) {
        if (content.Key) {
          keys.add(content.Key);
        }
      }

      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    return keys;
  })();

  return existingKeysPromise;
};

const contentTypeFor = (filename: string): string => {
  const contentType = mime.lookup(filename);
  if (!contentType) {
    throw new Error(`Unknown content type for ${filename}`);
  }

  if (contentType.startsWith("text/html")) {
    return "text/html; charset=utf-8";
  }

  if (contentType.startsWith("text/plain")) {
    return "text/plain; charset=utf-8";
  }

  return contentType;
};

const cacheControlFor = (key: string, filename: string): string => {
  if (filename.endsWith(".html")) {
    return "no-cache, max-age=0, must-revalidate";
  }

  if (key.startsWith("_astro/")) {
    return "public, max-age=31536000, immutable";
  }

  if (key.startsWith("img/")) {
    return "public, max-age=31536000, immutable";
  }

  return "public, max-age=3600";
};

const uploadFile = async (filename: string, key: string, overwrite: boolean): Promise<void> => {
  if (!overwrite) {
    const keys = await currentKeys();
    if (keys.has(key)) {
      return;
    }
  }

  console.log(`Uploading ${filename} to ${BUCKET}/${key}`);
  await s3.send(
    new PutObjectCommand({
      ACL: "public-read",
      Body: createReadStream(filename),
      Bucket: BUCKET,
      CacheControl: cacheControlFor(key, filename),
      ContentType: contentTypeFor(filename),
      Key: key,
    }),
  );
  (await currentKeys()).add(key);
  console.log("\tDone.");
};

const walkFiles = async (root: string): Promise<string[]> => {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name === ".DS_Store" || entry.name.includes(".tmp-")) {
      continue;
    }

    const fullPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      if (root === IMAGE_DIR && entry.name === "original") {
        continue;
      }

      files.push(...(await walkFiles(fullPath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
};

/**
 * Trip pages are served at extensionless URLs (/galena-april-2026). CloudFront's S3 origin maps a
 * path straight to a key, so galena-april-2026.html is stored under the key "galena-april-2026".
 * index.html stays as-is (it's the distribution's default root object), as does 404.html.
 */
const pageKey = (relative: string): string => {
  if (!relative.endsWith(".html") || relative === "index.html" || relative === "404.html") {
    return relative;
  }
  return relative.slice(0, -".html".length);
};

const uploadTree = async (root: string, keyPrefix: string, overwrite: boolean): Promise<void> => {
  const files = await walkFiles(root);

  for (const file of files) {
    const relative = path.relative(root, file).split(path.sep).join("/");
    const key = keyPrefix ? `${keyPrefix}/${relative}` : pageKey(relative);
    await uploadFile(file, key, overwrite);
  }
};

const runCommand = async (command: string, args: string[]): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });

const buildApp = async (): Promise<void> => {
  await runCommand("vp", ["run", "build"]);
};

const ensureDefaultRoot = async (): Promise<void> => {
  const response = await cloudfront.send(new GetDistributionConfigCommand({ Id: DISTRIBUTION }));

  if (!response.DistributionConfig || !response.ETag) {
    throw new Error("Missing CloudFront distribution config");
  }

  if (response.DistributionConfig.DefaultRootObject === "index.html") {
    return;
  }

  console.log(`Setting default root object to index.html on ${DISTRIBUTION}`);
  await cloudfront.send(
    new UpdateDistributionCommand({
      DistributionConfig: {
        ...response.DistributionConfig,
        DefaultRootObject: "index.html",
      },
      Id: DISTRIBUTION,
      IfMatch: response.ETag,
    }),
  );
  console.log("\tDone.");
};

const invalidateSite = async (): Promise<void> => {
  console.log(`Invalidating /* on ${DISTRIBUTION}`);
  await cloudfront.send(
    new CreateInvalidationCommand({
      DistributionId: DISTRIBUTION,
      InvalidationBatch: {
        CallerReference: `${Date.now()}`,
        Paths: {
          Items: ["/*"],
          Quantity: 1,
        },
      },
    }),
  );
  console.log("\tDone.");
};

const ensureDirectory = async (directory: string): Promise<void> => {
  const info = await stat(directory);
  if (!info.isDirectory()) {
    throw new Error(`${directory} is not a directory`);
  }
};

/** Every file the built site links to for each photo in data.json. */
const requiredImageKeys = async (): Promise<string[]> => {
  const data = JSON.parse(await readFile(DATA_FILE, "utf8")) as {
    sets: { images: { src: string }[] }[];
  };
  return data.sets.flatMap((set) =>
    set.images.flatMap((image) => [originalPath(image.src), ...allDerivedPaths(image.src)]),
  );
};

/**
 * Refuses to publish pages that would link to images that aren't in the bucket, e.g. when deploying
 * from a machine that only has some trips' full-size files and the rest haven't been converted yet.
 */
const ensureImagesUploaded = async (allowMissing: boolean): Promise<void> => {
  const keys = await currentKeys();
  const required = await requiredImageKeys();
  const missing = required.filter((key) => !keys.has(key));
  if (missing.length === 0) {
    return;
  }
  const photos = new Set(missing.map((key) => path.basename(key).replace(/\.\w+$/, "")));
  const message =
    `${missing.length} image files for ${photos.size} photos aren't in ${BUCKET}, e.g. ${missing[0]}. ` +
    "Run `vp run images` and then `vp run deploy` on the machine that has those photos' full-size files.";
  if (!allowMissing) {
    throw new Error(
      `${message}\nNothing but images was uploaded. Pass --allow-missing to publish anyway.`,
    );
  }
  console.warn(`Warning: ${message}`);
};

export const publish = async ({ allowMissing = false } = {}): Promise<void> => {
  await ensureDirectory(IMAGE_DIR);
  await buildApp();
  await ensureDirectory(DIST_DIR);
  await uploadTree(IMAGE_DIR, "img", false);
  await ensureImagesUploaded(allowMissing);
  await uploadTree(DIST_DIR, "", true);
  await ensureDefaultRoot();
  await invalidateSite();
};

const entrypoint = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;

if (entrypoint === import.meta.url) {
  publish({ allowMissing: process.argv.includes("--allow-missing") }).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
