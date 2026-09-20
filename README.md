# Steam Shelf

A small Steam item watchlist. Check prices, keep your reasoning next to an item, and see what remains after fees.

**[Open the app](https://steam-shelf-khonsu.vercel.app/)** · [Portfolio](https://khons-hu.vercel.app/)

## What it does

- Up to 12 CS2, Dota 2, TF2 or Rust items, with quantities, cost and a buy-price target.
- Manual EUR price checks through Steam's public price overview endpoint. No Steam login or API key.
- An in-app notice when a checked price meets your target. No background polling or closed-app push.
- Up to 60 observations per item, starting with your own checks. Manual price entry when Steam is unavailable.
- Estimated wallet proceeds, break-even price, notes and JSON backup/restore.
- Light/dark mode, keyboard controls, mobile layout and no animation loops.

Prices are lowest listings, not guaranteed sale prices. The undocumented endpoint can change or rate-limit requests. Quotes are cached for up to 10 minutes. Instance-local throttling is a best-effort limit, not a global distributed quota. No proxies or authenticated Steam sessions are used.

The fee calculator estimates 5% Steam + 10% game fees in EUR cents. Confirm the actual amount in Steam's sell dialog. Steam Wallet proceeds cannot be withdrawn as cash. [Steam Market FAQ](https://help.steampowered.com/en/faqs/view/61F0-72B7-9A18-C70B).

## Run

Node.js 20 or later, no dependencies:

```sh
npm test
npm start
```

Open http://127.0.0.1:4176. `npm run build` copies the frontend into `dist`. Vercel serves `api/price.js` as a function, with the Other framework preset and the settings in `vercel.json`.

No paid API, database, model calls or account system. Hosting is subject to your host's free-tier limits. Browser data is not synced. Export a backup before clearing site data.

## Privacy and scope

Watchlists, cost and notes stay in localStorage. A price check sends only the game's app ID and item name to this app's server, which requests a public EUR quote from Steam. Hosting providers may retain ordinary request logs. No analytics or tracking SDKs.

This app does not trade, connect a wallet, boost hours or automate Steam gameplay. Independent project, not affiliated with Valve.
