import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
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

const BUCKET = "ski.aarongutierrez.com";
const DISTRIBUTION = "ELFNI2LSHJUNK";
const DIST_DIR = "dist";
const IMAGE_DIR = "img";
const AWS_PROFILE = "push";

const credentials = fromIni({ profile: AWS_PROFILE });

const s3 = new S3Client({ credentials });
const cloudfront = new CloudFrontClient({ credentials });

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

const cacheControlFor = (key: string): string => {
  if (key === "index.html") {
    return "no-cache, max-age=0, must-revalidate";
  }

  if (key.startsWith("assets/")) {
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
      console.log(`Skipping existing key ${key}`);
      return;
    }
  }

  console.log(`Uploading ${filename} to ${BUCKET}/${key}`);
  await s3.send(
    new PutObjectCommand({
      ACL: "public-read",
      Body: createReadStream(filename),
      Bucket: BUCKET,
      CacheControl: cacheControlFor(key),
      ContentType: contentTypeFor(filename),
      Key: key,
    }),
  );
  console.log("\tDone.");
};

const walkFiles = async (root: string): Promise<string[]> => {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name === ".DS_Store") {
      continue;
    }

    const fullPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
};

const uploadTree = async (root: string, keyPrefix: string, overwrite: boolean): Promise<void> => {
  const files = await walkFiles(root);

  for (const file of files) {
    const relative = path.relative(root, file).split(path.sep).join("/");
    if (root === IMAGE_DIR && relative === "data.json") {
      continue;
    }

    const key = keyPrefix ? `${keyPrefix}/${relative}` : relative;
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
  await runCommand("vp", ["build"]);
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

const invalidateRoot = async (): Promise<void> => {
  console.log(`Invalidating / and /index.html on ${DISTRIBUTION}`);
  await cloudfront.send(
    new CreateInvalidationCommand({
      DistributionId: DISTRIBUTION,
      InvalidationBatch: {
        CallerReference: `${Date.now()}`,
        Paths: {
          Items: ["/", "/index.html"],
          Quantity: 2,
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

export const publish = async (): Promise<void> => {
  await buildApp();
  await ensureDirectory(DIST_DIR);
  await ensureDirectory(IMAGE_DIR);
  await uploadTree(DIST_DIR, "", true);
  await uploadTree(IMAGE_DIR, "img", false);
  await ensureDefaultRoot();
  await invalidateRoot();
};

const entrypoint = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;

if (entrypoint === import.meta.url) {
  publish().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
