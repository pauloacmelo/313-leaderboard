import type {
  LinksFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/cloudflare";
import { redirect, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import styles from "~/styles/table.css?url";

export const meta: MetaFunction = () => {
  return [
    { title: "Crossbox 313" },
    {
      name: "description",
      content: "CROSS PARA TODOS. UNINDO PESSOAS. MUDANDO VIDAS. DESDE 2016",
    },
  ];
};

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: styles },
  {
    rel: "stylesheet",
    href: "https://cdn.jsdelivr.net/npm/purecss@3.0.0/build/pure-min.css",
  },
];

export const loader = async ({
  request,
  context,
  params,
}: LoaderFunctionArgs) => {
  const { competition_handle: handle } = params;
  const competition = await context.api.loadCompetitionByHandle(handle);
  if (!competition) return redirect("/");
  const ranking = await context.api.loadRankingByHandle(handle);
  return {
    competition,
    ranking,
    url_division_id: new URL(request.url).searchParams.get("division_id"),
    userId: await context.getUserId(),
  };
};
export default function Index() {
  const { competition, ranking, url_division_id, userId } =
    useLoaderData<typeof loader>();
  const division_id = parseInt(
    url_division_id || competition.divisions?.[0]?.division_id
  );
  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        lineHeight: "1.8",
        maxWidth: 1000,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h1>{competition.competition_name}</h1>
        <div>
          <a href="/">Back</a>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          {userId && (
            <a
              href={`/${competition.competition_handle}/add?division_id=${division_id}`}
            >
              Add new submission
            </a>
          )}
        </div>
      </div>
      <div className="pure-menu pure-menu-horizontal">
        <ul className="pure-menu-list">
          {competition?.divisions?.map((division) => (
            <li
              key={division.division_id}
              className={`pure-menu-item ${
                division.division_id === division_id ? "pure-menu-selected" : ""
              }`}
            >
              <a
                href={`?division_id=${division.division_id}`}
                className="pure-menu-link"
              >
                {division.division_name}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <table>
        <thead>
          <tr>
            <th>RANK</th>
            <th>ATHLETE</th>
            <th>POINTS</th>
            {competition?.wods?.map((w) => (
              <th key={w.wod_id}>{w.wod_name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ranking
            .filter((r) => r.division_id === division_id)
            .map((r, i) => (
              <tr key={i}>
                <td data-column="RANK">{r.rank}</td>
                <td data-column="ATHLETE">{r.athlete}</td>
                <td data-column="POINTS">{r.points}</td>
                {competition.wods.map((w) => {
                  const submission = r.submissions.find(
                    (s) => s.wod_id === w.wod_id
                  );
                  const label = submission?.score_label
                    ? `(${submission?.score_label})`
                    : "-";
                  return (
                    <td data-column={w.wod_name} key={w.wod_id}>
                      {submission?.wod_rank}
                      <br />
                      <MaybeLink
                        href={
                          !userId
                            ? null
                            : submission?.submission_id
                            ? `/${competition.competition_handle}/add?id=${submission?.submission_id}`
                            : `/${competition.competition_handle}/add?&wod_id=${w.wod_id}&athlete=${r.athlete}&division_id=${r.division_id}`
                        }
                        label={label}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function MaybeLink({ href, label }: { href: string; label: string }) {
  return href ? <a href={href}>{label}</a> : <span>{label}</span>;
}

// function groupBy(arr, fn) {
//   return arr.reduce((acc, cur) => {
//     const key = fn(cur);
//     if (!acc[key]) {
//       acc[key] = [];
//     }
//     acc[key].push(cur);
//     return acc;
//   }, {});
// }
// function sortBy(arr, fn) {
//   return arr.sort((a, b) => fn(a) - fn(b));
// }
// function greatestBy(arr, fn) {
//   return sortBy(arr, fn)[arr.length - 1];
// }
// const ranking = Object.entries(groupBy(submissions, (s) => s.wod_id)).map(
//   ([wod_id, wod_submissions]) => [
//     wod_id,
//     sortBy(
//       Object.values(groupBy(wod_submissions, (s) => s.athlete)).map(
//         (wod_athlete_submissions) =>
//           greatestBy(wod_athlete_submissions, (s) => s.score_number)
//       ),
//       (s) => s.score_number
//     ).map((s, i) => ({ ...s, wod_rank: i + 1 })),
//   ]
// );
