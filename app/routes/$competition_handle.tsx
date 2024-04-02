import type {
  LinksFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/cloudflare";
import { redirect, useLoaderData } from "@remix-run/react";
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
          margin: "0 10px",
        }}
      >
        <h1>{competition.competition_name}</h1>
        <div>
          <a href="/">Voltar</a>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          {userId && (
            <a
              href={`/${competition.competition_handle}/add?division_id=${division_id}`}
            >
              Nova súmula
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
            <th className="desktop-only-columns">#</th>
            <th>ATLETA</th>
            <th className="desktop-only-columns">PTS</th>
            {competition?.wods?.map((w) => (
              <th key={w.wod_id} className="desktop-only-columns">
                {w.wod_name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ranking
            .filter((r) => r.division_id === division_id)
            .flatMap((r, i) => [
              <tr key={i}>
                <td className="mobile-cell">
                  <input
                    id={`collapsible-${i}`}
                    className="toggle"
                    type="checkbox"
                  />
                  <label htmlFor={`collapsible-${i}`} className="lbl-toggle">
                    {r.rank}&nbsp;&nbsp;&nbsp;({r.points})&nbsp;{r.athlete}
                  </label>
                  <div className="collapsible-content">
                    <div className="content-inner">
                      {competition.wods.map((w) => {
                        const submission = r.submissions.find(
                          (s) => s.wod_id === w.wod_id
                        );
                        const label = submission?.score_label
                          ? `(${submission?.score_label})`
                          : "-";
                        return (
                          <p key={w.wod_id}>
                            {w.wod_name}:&nbsp;{submission?.wod_rank}º&nbsp;
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
                          </p>
                        );
                      })}
                    </div>
                  </div>
                </td>

                <td className="desktop-cell" data-column="#">
                  {r.rank}
                </td>
                <td className="desktop-cell" data-column="ATLETA">
                  {r.athlete}
                </td>
                <td className="desktop-cell" data-column="PTS">
                  {r.points}
                </td>
                {competition.wods.map((w) => {
                  const submission = r.submissions.find(
                    (s) => s.wod_id === w.wod_id
                  );
                  const label = submission?.score_label
                    ? `(${submission?.score_label})`
                    : "-";
                  return (
                    <td
                      className="desktop-cell"
                      data-column={w.wod_name}
                      key={w.wod_id}
                    >
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
              </tr>,
            ])}
        </tbody>
      </table>
    </div>
  );
}

function MaybeLink({ href, label }: { href: string | null; label: string }) {
  return href ? <a href={href}>{label}</a> : <span>{label}</span>;
}
