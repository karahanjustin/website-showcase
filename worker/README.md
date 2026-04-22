# david-chat Worker

Cloudflare Worker that proxies the FAQ chatbot ("David") to the Anthropic API.
Deployed at: `https://david-chat.karahan-justin.workers.dev`

## Deploy

```bash
cd worker
wrangler deploy
```

## Update the API key

```bash
wrangler secret put ANTHROPIC_API_KEY
```

## Change the model

Edit `MODEL` in `wrangler.toml` and redeploy.
