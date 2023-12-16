# Bluesky Post Action

Github Action to send Bluesky posts.

## Workflow Usage

Configure your workflow to use `ethomson/send-tweet-action@v1`, and provide the tweet you want to send as the `status` input.

Provide the service host, username and passwor as the `service`, `identifier`, and
`password` inputs.

For example:

```yml
name: Send a Tweet
on: [push]
jobs:
  tweet:
    runs-on: ubuntu-latest
    steps:
      - uses: rg-wood/bluesky-post-action@v1
        with:
          text: 'Hello, Blue World!'
          service: https://bsky.social
          identifier: ric@grislyeye.com
          password: ${{ secrets.BLUESKY_PASSWORD }}
```

Now whenever you push something to your repository, GitHub Actions will post to Bluesky on your behalf.

### Replies

You can optionally set a tweet to reply to by setting the `replyto` input configuration. This takes an AT Protocol reference in JSON format.

For example:

```json
{
  "cid": "bafyreihp3sgpehpt4bwsqzyyeir3smzfesnvfzmh6hejqnggqqbscb4nue",
  "uri": "at://did:plc:kc6lo2m2mfjzj54humjq4usg/app.bsky.feed.post/3kgoijihwtb2f"
}
```

