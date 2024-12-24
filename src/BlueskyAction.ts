import * as core from "@actions/core";
import { BlobRef, AtpAgent, RichText } from "@atproto/api";
import * as fs from "fs";
import mime from "mime";
import Jimp from "jimp";

export type CID = string & { readonly "": unique symbol };
export type URI = string & { readonly "": unique symbol };

export interface Reference {
  readonly cid: CID;
  readonly uri: URI;
}

export class Reference {
  static parse(json: string | undefined): Reference | undefined {
    if (json) return JSON.parse(json) as Reference;
  }
}

const MB: number = 1000000;
const mediaMaxDimension: number = 900;
const mediaMaxFileSize: number = 0.976;
const mediaMaxResizeRetries: number = 3;
const mediaResizeFactor: number = 0.9;

export class BlueskyAction {
  private readonly agent: AtpAgent;
  private readonly identifier: string;
  private readonly password: string;

  constructor(service: string, identifier: string, password: string) {
    this.agent = new AtpAgent({ service: service });
    this.identifier = identifier;
    this.password = password;
  }

  private async loadBlob(
    filePath: string,
    mimeType: string,
    targetWidth: number | undefined = undefined,
    resizeRetry: number = 0,
  ): Promise<Buffer> {
    const blob: Jimp = await Jimp.read(filePath);
    const optimised = targetWidth
      ? await blob.resize(targetWidth, Jimp.AUTO).getBufferAsync(mimeType)
      : await blob.getBufferAsync(mimeType);
    const fileSize = optimised.length / MB;

    if (fileSize < mediaMaxFileSize || resizeRetry >= mediaMaxResizeRetries) {
      return optimised;
    } else {
      const currentWidth = blob.bitmap.width;
      const newTargetWidth =
        currentWidth > mediaMaxDimension
          ? mediaMaxDimension
          : currentWidth * mediaResizeFactor;

      core.debug(
        `🦋  ${filePath} too large (width=${currentWidth}, ${fileSize} MB): attempting resize to width ${newTargetWidth} (retry ${resizeRetry + 1})`,
      );

      return this.loadBlob(filePath, mimeType, newTargetWidth, resizeRetry + 1);
    }
  }

  private async uploadFile(filePath: string): Promise<BlobRef> {
    core.debug(`🦋  uploading media ${filePath}`);
    const mimeType = mime.getType(filePath);

    if (!mimeType)
      throw new Error(`Unsupported media type for upload ${filePath}`);

    const blob = await this.loadBlob(filePath, mimeType);
    const response = await this.agent.uploadBlob(blob, {
      encoding: mimeType,
    });

    return response.data.blob;
  }

  private async uploadAllMediaFrom(media: string): Promise<BlobRef[]> {
    if (fs.existsSync(media)) {
      const files = await fs.promises.readdir(media);
      return await Promise.all(
        files.map(async (file) => {
          const filePath = `${media}/${file}`;
          return await this.uploadFile(filePath);
        }),
      );
    }
    return [];
  }

  async run(
    text: string,
    replyTo?: Reference,
    media?: string,
  ): Promise<Reference> {
    core.info("🦋  Sending BlueSky post");
    await this.agent.login({
      identifier: this.identifier,
      password: this.password,
    });

    const rt = new RichText({
      text: text,
    });

    await rt.detectFacets(this.agent);

    const uploads = media ? await this.uploadAllMediaFrom(media) : undefined;

    const configureEmbed = (blobs: BlobRef[]) => {
      return {
        $type: "app.bsky.embed.images",
        images: blobs.map((blob) => {
          return {
            alt: "",
            image: blob,
          };
        }),
      };
    };

    const embed =
      uploads && uploads.length > 0 ? configureEmbed(uploads) : undefined;

    if (embed) core.info(`🦋  Posting with media [${uploads}]`);

    if (replyTo) {
      const request = {
        $type: "app.bsky.feed.post",
        text: rt.text,
        facets: rt.facets,
        createdAt: new Date().toISOString(),
        reply: {
          root: {
            cid: replyTo.cid,
            uri: replyTo.uri,
          },
          parent: {
            cid: replyTo.cid,
            uri: replyTo.uri,
          },
        },
        embed: embed,
      };

      const result = await this.agent.post(request);

      core.info(`🦋  Sent reply post ${result.cid}:${result.uri}`);
      return result as Reference;
    } else {
      const request = {
        $type: "app.bsky.feed.post",
        text: rt.text,
        facets: rt.facets,
        createdAt: new Date().toISOString(),
        embed: embed,
      };

      const result = await this.agent.post(request);

      core.info(`🦋  Sent post ${result.cid}:${result.uri}`);
      return result as Reference;
    }
  }
}
