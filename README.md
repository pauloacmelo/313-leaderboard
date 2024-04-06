# Welcome to Remix + Vite!

📖 See the [Remix docs](https://remix.run/docs) and the [Remix Vite docs](https://remix.run/docs/en/main/future/vite) for details on supported features.

## Typegen

Generate types for your Cloudflare bindings in `wrangler.toml`:

```sh
npm run typegen
```

You will need to rerun typegen whenever you make changes to `wrangler.toml`.

## Development

Run the Vite dev server:

```sh
npm run dev
```

To run Wrangler:

```sh
npm run build
npm run start
```

## Deployment

> [!WARNING]  
> Cloudflare does _not_ use `wrangler.toml` to configure deployment bindings.
> You **MUST** [configure deployment bindings manually in the Cloudflare dashboard][bindings].

First, build your app for production:

```sh
npm run build
```

Then, deploy your app to Cloudflare Pages:

```sh
npm run deploy
```

[bindings]: https://developers.cloudflare.com/pages/functions/bindings/

### TODO

- [ ] Fix type errors
- [x] Fix routing
- [x] Move db token to env var
- [x] Some authentication
- [x] Add divisions
- [x] Localize in PT-BR
- [x] Page to edit/insert submissions
- [ ] Improve authentication (email link)
- [ ] Custom domain
- [ ] Page to edit/insert competitions
- [ ] Add Documentation
- [ ] Make it live using websockets
- [ ] Animation for ranking change
- [ ] Order by each wod
