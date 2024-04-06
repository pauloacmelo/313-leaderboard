import { Client, createClient, InArgs } from "@libsql/client";
import {
  createCookieSessionStorage,
  type AppLoadContext,
  SessionData,
} from "@remix-run/cloudflare";
import { type PlatformProxy } from "wrangler";
import crypto from "node:crypto";

// When using `wrangler.toml` to configure bindings,
// `wrangler types` will generate types for those bindings
// into the global `Env` interface.
// Need this empty interface so that typechecking passes
// even if no `wrangler.toml` exists.
interface Env {
  TURSO_TOKEN: string;
  RESEND_TOKEN: string;
  SECRET_KEY: string;
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
    jwt: jwt(
      context.cloudflare.env.SECRET_KEY || process.env.SECRET_KEY || "secret"
    ),
    getSession,
    commitSession,
    destroySession,
    sendEmail,
    getUserId: async () =>
      (await getSession(request.headers.get("Cookie"))).get("userId"),
  };

  async function sendEmail({
    to,
    subject,
    html,
  }: {
    to: string;
    subject: string;
    html: string;
  }) {
    const token =
      context.cloudflare.env.RESEND_TOKEN || process.env.RESEND_TOKEN;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to,
        subject,
        html,
      }),
    });
  }
};

const api = (client: Client) => {
  return {
    loadCompetitions,
    loadCompetitionByHandle,
    loadSubmissionsByHandle,
    loadSubmissionById,
    loadRankingByHandle,
    saveSubmission,
    updateRanking,
    saveCompetition,
    loadUsers,
    saveUser,
    destroyUser,
  };
  async function loadUsers(args) {
    const { user_email } = args || {};
    const sql = `select * from users where true ${
      user_email ? "and user_email = $user_email" : ""
    }`;
    return (
      await client.execute({
        sql,
        args: removeUndefined({ user_email }),
      })
    ).rows;
  }
  async function destroyUser({ user_id }) {
    await client.execute({
      sql: `delete from users where user_id = $user_id`,
      args: { user_id },
    });
  }
  async function saveUser({ user_id, user_email }) {
    return await client.execute(
      save(
        "users",
        removeUndefined({
          user_email,
        }),
        { user_id }
      )
    );
  }

  async function loadCompetitions() {
    const result = (await client.execute(`select * from competitions`)).rows;
    return result;
  }
  async function loadCompetitionByHandle(competition_handle) {
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
  }
  async function loadSubmissionsByHandle(competition_handle) {
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
  }
  async function loadSubmissionById(submission_id) {
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
  }
  async function loadRankingByHandle(competition_handle) {
    const result = (
      await client.execute({
        sql: `select * from rankings where competition_handle = $competition_handle;`,
        args: { competition_handle },
      })
    ).rows;
    return result?.map((row) => ({
      ...row,
      ...(row.submissions ? { submissions: JSON.parse(row.submissions) } : {}),
    }));
  }
  async function saveSubmission({
    submission_id,
    athlete,
    wod_id,
    division_id,
    scores,
    score_label,
    wod_date,
  }) {
    const result = await client.execute(
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
    const { competition_handle } = (
      await client.execute({
        sql: `select competition_handle from wods left join competitions on competitions.competition_id = wods.competition_id where wod_id = $wod_id`,
        args: { wod_id },
      })
    ).rows[0];
    await updateRanking({ competition_handle });
    return result;
  }
  async function updateRanking({ competition_handle }) {
    await client.execute({
      sql: `delete from rankings where competition_handle = $competition_handle`,
      args: { competition_handle },
    });
    await client.execute({
      sql: `
  insert into rankings (competition_handle, athlete, division_id, rank, points, submissions)
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
      competitions.competition_handle,
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
    competition_handle,
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
    });
  }
  async function saveCompetition({
    competition_id,
    competition_name,
    competition_handle,
    divisions,
  }) {
    return await client.execute(
      save(
        "competitions",
        removeUndefined({ competition_name, competition_handle }),
        { competition_id }
      )
    );
  }
};

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

type Algorithm = "HS256" | "HS384" | "HS512" | "RS256";
const algorithmMap = {
  HS256: "sha256",
  HS384: "sha384",
  HS512: "sha512",
  RS256: "RSA-SHA256",
} as const;
const typeMap = {
  HS256: "hmac",
  HS384: "hmac",
  HS512: "hmac",
  RS256: "sign",
} as const;
const jwt = (jwtKey: string) => {
  return {
    version: "0.5.6",
    encryptJWT: (obj: Record<string, unknown>): string =>
      jwt_encode(obj, jwtKey),
    decryptJWT: (token: string) => {
      try {
        return jwt_decode(token, jwtKey);
      } catch (err) {
        console.log("decode error", err);
        return null;
      }
    },
  };

  function jwt_decode(token: string, key: string, algorithm?: Algorithm) {
    if (!token) throw new Error("No token supplied");
    const segments = token.split(".");
    if (segments.length !== 3)
      throw new Error("Not enough or too many segments");
    const headerSeg = segments[0];
    const payloadSeg = segments[1];
    const signatureSeg = segments[2];

    const header = JSON.parse(base64urlDecode(headerSeg));
    const payload = JSON.parse(base64urlDecode(payloadSeg));

    if (!algorithm && /BEGIN( RSA)? PUBLIC KEY/.test(key.toString()))
      algorithm = "RS256";

    const coercedAlgorithm = algorithm || (header.alg as Algorithm);
    const signingMethod = algorithmMap[coercedAlgorithm];
    const signingType = typeMap[coercedAlgorithm];
    if (!signingMethod || !signingType)
      throw new Error("Algorithm not supported");
    const signingInput = [headerSeg, payloadSeg].join(".");
    if (!verify(signingInput, key, signingMethod, signingType, signatureSeg))
      throw new Error("Signature verification failed");
    if (payload.nbf && Date.now() < payload.nbf * 1000)
      throw new Error("Token not yet active");
    if (payload.exp && Date.now() > payload.exp * 1000)
      throw new Error("Token expired");

    return payload;
  }
  function jwt_encode(
    payload: Record<string, unknown>,
    key: string,
    algorithm?: Algorithm,
    options?: { header: Record<string, unknown> }
  ) {
    if (!key) throw new Error("Require key");
    if (!algorithm) algorithm = "HS256";
    const signingMethod = algorithmMap[algorithm];
    const signingType = typeMap[algorithm];
    if (!signingMethod || !signingType)
      throw new Error("Algorithm not supported");
    const header = { typ: "JWT", alg: algorithm };
    if (options && options.header) {
      assignProperties(header, options.header);
    }
    const segments = [];
    segments.push(base64urlEncode(JSON.stringify(header)));
    segments.push(base64urlEncode(JSON.stringify(payload)));
    segments.push(sign(segments.join("."), key, signingMethod, signingType));

    return segments.join(".");
  }
  function assignProperties<T extends Record<string, unknown>>(
    dest: T,
    source: T
  ) {
    for (const attr in source) {
      if (source.hasOwnProperty(attr)) {
        dest[attr] = source[attr];
      }
    }
  }
  function verify(
    input: string,
    key: string,
    method: (typeof algorithmMap)[Algorithm],
    type: (typeof typeMap)[Algorithm],
    signature: string
  ) {
    if (type === "hmac") {
      return signature === sign(input, key, method, type);
    } else if (type == "sign") {
      return crypto
        .createVerify(method)
        .update(input)
        .verify(key, base64urlUnescape(signature), "base64");
    } else {
      throw new Error("Algorithm type not recognized");
    }
  }
  function sign(
    input: string,
    key: string,
    method: (typeof algorithmMap)[Algorithm],
    type: (typeof typeMap)[Algorithm]
  ) {
    var base64str;
    if (type === "hmac") {
      base64str = crypto.createHmac(method, key).update(input).digest("base64");
    } else if (type == "sign") {
      base64str = crypto.createSign(method).update(input).sign(key, "base64");
    } else {
      throw new Error("Algorithm type not recognized");
    }

    return base64urlEscape(base64str);
  }
  function base64urlDecode(str: string) {
    return Buffer.from(base64urlUnescape(str), "base64").toString();
  }
  function base64urlUnescape(str: string) {
    str += new Array(5 - (str.length % 4)).join("=");
    return str.replace(/\-/g, "+").replace(/_/g, "/");
  }
  function base64urlEncode(str: string) {
    return base64urlEscape(Buffer.from(str).toString("base64"));
  }
  function base64urlEscape(str: string) {
    return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }
};
