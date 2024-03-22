import { Client, ResultSet, Row, createClient } from "@libsql/client";
import { type AppLoadContext } from "@remix-run/cloudflare";
import { type PlatformProxy } from "wrangler";

// When using `wrangler.toml` to configure bindings,
// `wrangler types` will generate types for those bindings
// into the global `Env` interface.
// Need this empty interface so that typechecking passes
// even if no `wrangler.toml` exists.
interface Env {
  TURSO_TOKEN: string;
}

type Cloudflare = Omit<PlatformProxy<Env>, "dispose">;

declare module "@remix-run/cloudflare" {
  interface AppLoadContext {
    cloudflare: Cloudflare;
  }
}

type GetLoadContext = (args: {
  request: Request;
  context: { cloudflare: Cloudflare }; // load context _before_ augmentation
}) => AppLoadContext;

// Shared implementation compatible with Vite, Wrangler, and Cloudflare Pages
export const getLoadContext: GetLoadContext = ({ context }) => {
  const client = createClient({
    url: "libsql://313-leaderboard-pauloacmelo.turso.io",
    authToken: context.cloudflare.env.TURSO_TOKEN || process.env.TURSO_TOKEN,
  });
  return {
    ...context,
    // client,
    api: api(client),
  };
};

const api = (client: Client) => ({
  loadCompetitions: async () => {
    const reuslt = (await client.execute(`select * from competitions`)).rows;
    return reuslt;
  },
});
