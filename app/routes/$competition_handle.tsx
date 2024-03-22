import type {
  LinksFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
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

export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { competition_handle: handle } = params;
  const competition = await context.api.loadCompetitionByHandle(handle);
  // const submissions = await context.api.loadSubmissionsByHandle(handle);
  const ranking = await context.api.loadRankingByHandle(handle);
  return {
    competition,
    // submissions,
    ranking,
  };
};
export default function Index() {
  const { competition, ranking } = useLoaderData<typeof loader>();
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
          <a href={`/${competition.competition_handle}/add`}>
            Add new submission
          </a>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>RANK</th>
            <th>ATHLETE</th>
            <th>POINTS</th>
            {competition.wods.map((w) => (
              <th key={w.wod_id}>{w.wod_name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ranking.map((r, i) => (
            <tr key={i}>
              <td data-column="RANK">{r.rank}</td>
              <td data-column="ATHLETE">{r.athlete}</td>
              <td data-column="POINTS">{r.points}</td>
              {competition.wods.map((w) => {
                const submission = r.submissions.find(
                  (s) => s.wod_id === w.wod_id
                );
                return (
                  <td data-column={w.wod_name} key={w.wod_id}>
                    {submission?.wod_rank}
                    <br />
                    {submission.submission_id ? (
                      <a
                        href={`/${competition.competition_handle}/add?id=${submission.submission_id}`}
                      >
                        {submission?.score_label || "-"}
                      </a>
                    ) : (
                      submission?.score_label || "-"
                    )}
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
