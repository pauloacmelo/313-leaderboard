import { Client, createClient } from "@libsql/client";
import {
  createCookieSessionStorage,
  type AppLoadContext,
  SessionData,
} from "@remix-run/cloudflare";
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
export const getLoadContext: GetLoadContext = ({ context, request }) => {
  const client = createClient({
    url: "libsql://313-leaderboard-pauloacmelo.turso.io",
    authToken: context.cloudflare.env.TURSO_TOKEN || process.env.TURSO_TOKEN,
  });
  const { getSession, commitSession, destroySession } =
    createCookieSessionStorage<SessionData>({
      // a Cookie from `createCookie` or the CookieOptions to create one
      cookie: {
        name: "__session",

        // all of these are optional
        // domain: "remix.run",
        // Expires can also be set (although maxAge overrides it when used in combination).
        // Note that this method is NOT recommended as `new Date` creates only one date on each server deployment, not a dynamic date in the future!
        //
        // expires: new Date(Date.now() + 60_000),
        httpOnly: true,
        // maxAge: 60,
        path: "/",
        sameSite: "lax",
        secrets: ["s3cret1"],
        secure: true,
      },
    });
  return {
    ...context,
    api: api(client),
    getSession,
    commitSession,
    destroySession,
    getUserId: async () =>
      (await getSession(request.headers.get("Cookie"))).get("userId"),
  };
};

const api = (client: Client) => ({
  loadCompetitions: async () => {
    const result = (await client.execute(`select * from competitions`)).rows;
    return result;
  },
  loadCompetitionByHandle: async (competition_handle) => {
    const result = (
      await client.execute({
        sql: `
          select
            competitions.*,
            json_group_array(
              json_object(
                'wod_id', wod_id,
                'wod_name', wod_name,
                'wod_description', wod_description
              )
            ) wods,
            (
              select 
                json_group_array(
                  json_object('division_id', division_id, 'division_name', division_name)
                )
              from divisions where competition_id = competitions.competition_id
            ) divisions
          from competitions
          left join wods on wods.competition_id = competitions.competition_id
          where competition_handle = $competition_handle
          group by competitions.competition_id;
        `,
        args: { competition_handle },
      })
    ).rows[0];
    return (
      result && {
        ...result,
        ...(result?.wods ? { wods: JSON.parse(result?.wods) } : {}),
        ...(result?.divisions
          ? { divisions: JSON.parse(result?.divisions) }
          : {}),
      }
    );
  },
  loadSubmissionsByHandle: async (competition_handle) => {
    const result = (
      await client.execute({
        sql: `
          select
            submissions.*
          from submissions
          left join wods on wods.wod_id = submissions.wod_id
          left join competitions on competitions.competition_id = wods.competition_id
          where competition_handle = $competition_handle
          order by wod_id, wod_date desc;
        `,
        args: { competition_handle },
      })
    ).rows;
    return result;
  },
  loadSubmissionById: async (submission_id) => {
    const result = (
      await client.execute({
        sql: `
          select
            submissions.*
          from submissions
          left join wods on wods.wod_id = submissions.wod_id
          left join competitions on competitions.competition_id = wods.competition_id
          where submission_id = $submission_id
          order by wod_id, wod_date desc;
        `,
        args: { submission_id },
      })
    ).rows[0];
    return result;
  },
  loadRankingByHandle: async (competition_handle) => {
    const result = (
      await client.execute({
        sql: `
    with best_submissions as (
      select submissions.*,
        (
          select count(*)+1
          from submissions s2
          where s2.athlete = submissions.athlete
            and s2.wod_id = submissions.wod_id
            and s2.division_id = submissions.division_id
            and (
              s2.scores->0 < submissions.scores->0 or
              (s2.scores->0 = submissions.scores->0 and s2.scores->1 > submissions.scores->1) or
              (s2.scores->0 = submissions.scores->0 and s2.scores->1 = submissions.scores->1 and s2.scores->2 < submissions.scores->2)
            )
        ) submission_rank
      from submissions
      left join wods on wods.wod_id = submissions.wod_id
      left join competitions on wods.competition_id = competitions.competition_id
      where competition_handle = $competition_handle
    ),
    athletes as (
      select distinct athlete, division_id
      from best_submissions
    ),
    full_submissions as (
      select *
      from wods
      inner join athletes on true
      full join best_submissions on wods.wod_id = best_submissions.wod_id and best_submissions.athlete = athletes.athlete
      left join competitions on wods.competition_id = competitions.competition_id
      where submission_rank = 1
    ),
    ranked_submissions as (
      select *,
        (
          select count(*) + 1
          from full_submissions f2
          where f2.wod_id = f1.wod_id
            and f2.division_id = f1.division_id
            and (
              coalesce(f2.scores->0, 'XX:XX') < coalesce(f1.scores->0, 'XX:XX') or
              (coalesce(f2.scores->0, 'XX:XX') = coalesce(f1.scores->0, 'XX:XX') and coalesce(f2.scores->1, 0) > coalesce(f1.scores->1, 0)) or
              (coalesce(f2.scores->0, 'XX:XX') = coalesce(f1.scores->0, 'XX:XX') and coalesce(f2.scores->1, 0) = coalesce(f1.scores->1, 0) and coalesce(f2.scores->2, 'XX:XX') < coalesce(f1.scores->2, 'XX:XX'))
            )
        ) wod_rank
      from full_submissions f1
    )
    select
      athlete,
      division_id,
      row_number() over (partition by division_id order by sum(wod_rank)) rank,
      sum(wod_rank) points,
      json_group_array(
        json_object(
          'athlete', athlete,
          'wod_id', wod_id,
          'wod_name', wod_name,
          'wod_rank', wod_rank,
          'submission_id', submission_id,
          'score_number', score_number,
          'score', scores,
          'score_label', score_label
        )
      ) submissions
    from ranked_submissions
    group by athlete, division_id
    order by sum(wod_rank);
    `,
        args: { competition_handle },
      })
    ).rows;
    return result?.map((row) => ({
      ...row,
      ...(row.submissions ? { submissions: JSON.parse(row.submissions) } : {}),
    }));
  },
  saveSubmission: async ({
    submission_id,
    athlete,
    wod_id,
    division_id,
    score_number,
    score_label,
    wod_date,
  }) => {
    return submission_id
      ? await client.execute({
          sql: `
        update submissions
        set
          athlete = $athlete,
          wod_id = $wod_id,
          division_id = $division_id,
          score_number = $score_number,
          score_label = $score_label,
          wod_date = $wod_date
        where submission_id = $submission_id;
      `,
          args: {
            athlete,
            wod_id,
            division_id,
            score_number,
            score_label,
            wod_date,
            submission_id,
          },
        })
      : await client.execute({
          sql: `
        insert into submissions (athlete, wod_id, division_id, score_number, score_label, wod_date)
        values ($athlete, $wod_id, $division_id, $score_number, $score_label, $wod_date);
      `,
          args: {
            athlete,
            wod_id,
            division_id,
            score_number,
            score_label,
            wod_date,
          },
        });
  },
});
