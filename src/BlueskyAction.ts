import * as core from '@actions/core'
import { BskyAgent, RichText } from '@atproto/api'

export type CID = string & { readonly '': unique symbol }
export type URI = string & { readonly '': unique symbol }

export class Reference {
  readonly cid: CID
  readonly uri: URI

  constructor(cid: CID, uri: URI) {
    this.cid = cid
    this.uri = uri
  }

  static parse(json: string | undefined): Reference | undefined {
    if (json) return JSON.parse(json) as Reference
  }
}

export class BlueskyAction {

  private readonly agent: BskyAgent
  private readonly identifier: string
  private readonly password: string

  constructor(service: string, identifier: string, password: string) {
    this.agent = new BskyAgent({ service: service })
    this.identifier = identifier
    this.password = password
  }

  async run(text: string, replyTo: Reference | undefined): Promise<Reference> {
    core.info("☁️  Sending BlueSky post")
    await this.agent.login({ identifier: this.identifier, password: this.password })

    const rt = new RichText({
      text: text,
    })

    await rt.detectFacets(this.agent)

    if (replyTo) {
      const request = {
        $type: 'app.bsky.feed.post',
        text: rt.text,
        facets: rt.facets,
        createdAt: new Date().toISOString(),
        reply: {
          root: {
            cid: replyTo.cid,
            uri: replyTo.uri
          },
          parent: {
            cid: replyTo.cid,
            uri: replyTo.uri
          },
        }
      }

      const result = await this.agent.post(request)

      core.info(`☁️  Sent reply post ${result.cid}:${result.uri}`)
      return result as Reference
    } else {
      const request = {
        $type: 'app.bsky.feed.post',
        text: rt.text,
        facets: rt.facets,
        createdAt: new Date().toISOString(),
      }

      const result = await this.agent.post(request)

      core.info(`☁️  Sent post ${result.cid}:${result.uri}`)
      return result as Reference
    }

  }

}
