import { Client, createClient } from "@libsql/client";
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
    return {
      ...result,
      wods: JSON.parse(result.wods),
      divisions: JSON.parse(result.divisions),
    };
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
  loadRankingByHandle: async (competition_handle) => {
    const result = (
      await client.execute({
        sql: `
    with athletes as (
      select distinct athlete, division_id
      from submissions
      left join wods on wods.wod_id = submissions.wod_id
      left join competitions on wods.competition_id = competitions.competition_id
      where competition_handle = $competition_handle
    ),
    full_submissions as (
      select *
      from wods
      inner join athletes on true
      full join submissions on wods.wod_id = submissions.wod_id and submissions.athlete = athletes.athlete
      left join competitions on wods.competition_id = competitions.competition_id
      where competition_handle = $competition_handle
    ),
    ranked_submissions as (
      select *,
        (
          select count(*) + 1
          from full_submissions f2
          where f2.wod_id = f1.wod_id and f2.division_id = f1.division_id and coalesce(f2.score_number, 0) > coalesce(f1.score_number, 0)
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
    return result.map((row) => ({
      ...row,
      submissions: JSON.parse(row.submissions),
    }));
  },
  saveSubmission: async ({
    submission_id,
    athlete,
    wod_id,
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
          score_number = $score_number,
          score_label = $score_label,
          wod_date = $wod_date
        where submission_id = $submission_id;
      `,
          args: {
            athlete,
            wod_id,
            score_number,
            score_label,
            wod_date,
            submission_id,
          },
        })
      : await client.execute({
          sql: `
        insert into submissions (athlete, wod_id, score_number, score_label, wod_date)
        values ($athlete, $wod_id, $score_number, $score_label, $wod_date);
      `,
          args: {
            athlete,
            wod_id,
            score_number,
            score_label,
            wod_date,
          },
        });
  },
});
