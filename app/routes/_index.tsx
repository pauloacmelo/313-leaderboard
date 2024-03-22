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

export const loader = async ({ context }: LoaderFunctionArgs) => {
  return {
    competitions: await context.api.loadCompetitions(),
  };
};
export default function Index() {
  const { competitions } = useLoaderData<typeof loader>();
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
      <h1>Crossbox 313</h1>
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
