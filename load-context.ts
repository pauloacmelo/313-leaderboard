import { Client, createClient, InArgs } from "@libsql/client";
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
                'wod_description', wod_description,
                'wod_config', wod_config
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
        ...(result?.wods
          ? {
              wods: JSON.parse(result?.wods).map((wod) => ({
                ...wod,
                wod_config: JSON.parse(wod.wod_config),
              })),
            }
          : {}),
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
    return {
      ...result,
      scores: result.scores ? JSON.parse(result.scores) : result.scores,
    };
  },
  loadRankingByHandle: async (competition_handle) => {
    const result = (
      await client.execute({
        sql: `
      with best_submissions as (
        select f1.*,
        (
          select count(*) + 1 --string_agg(submission_id || ':' || comparison, '|')
          from (
            select
              f2.submission_id, substr(string_agg(nullif(
                case
                  when f1.scores->>value is null and f2.scores->>value is null then 0
                  when f1.scores->>value is null then -1
                  when f2.scores->>value is null then 1
                  else
                    case
                      when f1.scores->>value = f2.scores->>value then 0
                      when f1.scores->>value > f2.scores->>value then 1
                      when f1.scores->>value < f2.scores->>value then -1
                    end * case
                      when wods.wod_config->value->>'order' = 'asc' then -1
                      when wods.wod_config->value->>'order' = 'desc' then 1
                      else  0
                    end
                end, 0), ''), 1, 1) comparison
            from submissions f2
            left join generate_series(0, max(json_array_length(wods.wod_config)-1, 0)) on true
            where coalesce(f2.submission_id, 0) != coalesce(f1.submission_id, 0)
              and f2.wod_id = f1.wod_id
              and f2.athlete = f1.athlete
              and f2.division_id = f1.division_id
            group by f2.submission_id
          ) subq
          where comparison = '-'
        ) submission_rank
      from submissions f1
      left join wods on wods.wod_id = f1.wod_id
      left join competitions on competitions.competition_id = wods.competition_id
      where competition_handle = $competition_handle
    ),
    athletes as (
      select distinct athlete, division_id
      from best_submissions
    ),
    full_submissions as (
      select
        wods.*,
        athletes.*,
        best_submissions.submission_id,
        coalesce(best_submissions.scores, json_array()) scores,
        best_submissions.score_label,
        best_submissions.wod_date
      from wods
      inner join athletes on true
      left join best_submissions on wods.wod_id = best_submissions.wod_id and best_submissions.athlete = athletes.athlete and best_submissions.division_id = athletes.division_id
      left join competitions on wods.competition_id = competitions.competition_id
      where coalesce(submission_rank, 1) = 1
    ),
    ranked_submissions as (
      select f1.*,
        (
          select count(*) + 1 --string_agg(submission_id || ':' || comparison, '|')
          from (
            select
              f2.submission_id, substr(string_agg(nullif(
                case
                  when f1.scores->>value is null and f2.scores->>value is null then 0
                  when f1.scores->>value is null then -1
                  when f2.scores->>value is null then 1
                  else
                    case
                      when f1.scores->>value = f2.scores->>value then 0
                      when f1.scores->>value > f2.scores->>value then 1
                      when f1.scores->>value < f2.scores->>value then -1
                    end * case
                      when f1.wod_config->value->>'order' = 'asc' then -1
                      when f1.wod_config->value->>'order' = 'desc' then 1
                      else  0
                    end
                end, 0), ''), 1, 1) comparison
            from full_submissions f2
            left join generate_series(0, max(json_array_length(f1.wod_config)-1, 0)) on true
            where coalesce(f2.submission_id, 0) != coalesce(f1.submission_id, 0)
              and f2.wod_id = f1.wod_id
              and f2.division_id = f1.division_id
            group by f2.submission_id
          ) subq
          where comparison = '-'
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
          'scores', scores,
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
    scores,
    score_label,
    wod_date,
  }) => {
    return await client.execute(
      save(
        "submissions",
        removeUndefined({
          athlete,
          wod_id,
          division_id,
          scores,
          score_label,
          wod_date,
        }),
        { submission_id }
      )
    );
  },
  saveCompetition: async ({
    competition_id,
    competition_name,
    competition_handle,
    divisions,
  }) => {
    return await client.execute(
      save(
        "competitions",
        removeUndefined({ competition_name, competition_handle }),
        { competition_id }
      )
    );
  },
});

function removeUndefined(obj: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  );
}
function save(table_name: string, setFields: InArgs, conditions: InArgs) {
  return Object.values(conditions).some(Boolean)
    ? update(table_name, setFields, conditions)
    : insert(table_name, setFields);
}
function update(table_name: string, setFields: InArgs, conditions: InArgs) {
  const conditionStr = Object.keys(conditions)
    .map((key) => `${key} = $${key}`)
    .join(" and ");
  const fields = Object.keys(setFields)
    .map((key) => `${key} = $${key}`)
    .join(", ");
  return {
    sql: `update ${table_name}
    set ${fields}
    where ${conditionStr}
`,
    args: {
      ...setFields,
      ...conditions,
    },
  };
}
function insert(table_name: string, fields: InArgs) {
  return {
    sql: `
      insert into ${table_name} (${Object.keys(fields).join(", ")})
      values (${Object.keys(fields)
        .map((x) => `$${x}`)
        .join(", ")});
    `,
    args: fields,
  };
}
