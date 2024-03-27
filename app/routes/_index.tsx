import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "Crossbox 313" },
    {
      name: "description",
      content: "CROSS PARA TODOS. UNINDO PESSOAS. MUDANDO VIDAS. DESDE 2016",
    },
  ];
};

export const loader = async ({ context, request }: LoaderFunctionArgs) => {
  return {
    competitions: await context.api.loadCompetitions(),
    userId: await context.getUserId(),
  };
};
export default function Index() {
  const { competitions, userId } = useLoaderData<typeof loader>();
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
        <h1>Crossbox 313</h1>

        <div>
          {userId ? (
            <a href="/logout">Sair</a>
          ) : (
            <a href="/login">Administrar</a>
          )}
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          {userId && <a href={`/add`}>Novo campeonato</a>}
        </div>
      </div>
      <ul>
        {competitions.map((competition) => (
          <li key={competition.competition_id}>
            <a href={`/${competition.competition_handle}`}>
              {competition.competition_name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
