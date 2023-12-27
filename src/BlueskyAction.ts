import * as core from "@actions/core";
import { BlobRef, BskyAgent, RichText } from "@atproto/api";
import * as fs from "fs";
import mime from "mime";

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

export class BlueskyAction {
  private readonly agent: BskyAgent;
  private readonly identifier: string;
  private readonly password: string;

  constructor(service: string, identifier: string, password: string) {
    this.agent = new BskyAgent({ service: service });
    this.identifier = identifier;
    this.password = password;
  }

  async run(
    text: string,
    replyTo?: Reference,
    media?: string,
  ): Promise<Reference> {
    core.info("☁️  Sending BlueSky post");
    await this.agent.login({
      identifier: this.identifier,
      password: this.password,
    });

    const rt = new RichText({
      text: text,
    });

    await rt.detectFacets(this.agent);

    const uploadMedia: (
      media: string,
    ) => Promise<BlobRef[] | undefined> = async (media: string) => {
      if (fs.existsSync(media)) {
        const files = await fs.promises.readdir(media);
        return await Promise.all(
          files.map(async (file) => {
            const filePath = `${media}/${file}`;
            const mimeType = mime.getType(file);

            core.debug(`☁️  uploading media ${filePath}`);
            const blob = await fs.promises.readFile(filePath);

            if (!mimeType)
              throw new Error(`Unsupported media type for upload ${filePath}`);

            const response = await this.agent.uploadBlob(blob, {
              encoding: mimeType,
            });
            return response.data.blob;
          }),
        );
      }
    };

    const uploads = media ? await uploadMedia(media) : [];

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
        embed: {
          $type: "app.bsky.embed.images",
          images: uploads!.map((blob) => {
            return {
              alt: "",
              image: blob,
            };
          }),
        },
      };

      const result = await this.agent.post(request);

      core.info(`☁️  Sent reply post ${result.cid}:${result.uri}`);
      return result as Reference;
    } else {
      const request = {
        $type: "app.bsky.feed.post",
        text: rt.text,
        facets: rt.facets,
        createdAt: new Date().toISOString(),
        embed: {
          $type: "app.bsky.embed.images",
          images: uploads!.map((blob) => {
            return {
              alt: "",
              image: blob,
            };
          }),
        },
      };

      const result = await this.agent.post(request);

      core.info(`☁️  Sent post ${result.cid}:${result.uri}`);
      return result as Reference;
    }
  }
}
