import type {
  ActionFunctionArgs,
  LinksFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { redirect } from "react-router";

export const meta: MetaFunction = () => {
  return [
    { title: "Crossbox 313" },
    {
      name: "description",
      content: "CROSS PARA TODOS. UNINDO PESSOAS. MUDANDO VIDAS. DESDE 2016",
    },
  ];
};

{
  /* <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/purecss@3.0.0/build/pure-min.css" integrity="sha384-X38yfunGUhNzHpBaEBsWLO+A0HDYOQi8ufWDkZ0k9e0eXz/tH3II7uKZ9msv++Ls" crossorigin="anonymous"></link> */
}
export const links: LinksFunction = () => [
  {
    rel: "stylesheet",
    href: "https://cdn.jsdelivr.net/npm/purecss@3.0.0/build/pure-min.css",
  },
];

export const loader = async ({
  context,
  request,
  params,
}: LoaderFunctionArgs) => {
  const { competition_handle: handle } = params;
  if (!(await context.getUserId())) return redirect(`/${handle}`);
  const searchParams = new URL(request.url).searchParams;
  const competition = await context.api.loadCompetitionByHandle(handle);
  const submission = searchParams.get("id")
    ? await context.api.loadSubmissionById(searchParams.get("id"))
    : {
        wod_id:
          searchParams.get("wod_id") && parseInt(searchParams.get("wod_id")),
        athlete: searchParams.get("athlete"),
        division_id: searchParams.get("division_id"),
      };
  return {
    competition,
    // athletes,
    submission,
  };
};
export default function Index() {
  const { competition, submission } = useLoaderData<typeof loader>();
  const [wod_id, setWodId] = useState(
    submission?.wod_id || competition.wods[0].wod_id
  );
  const wod = competition.wods.find((w) => w.wod_id === wod_id);
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
        <a href={`/${competition.competition_handle}`}>Voltar</a>
      </div>
      <form
        className="pure-form pure-form-stacked"
        method="post"
        action={`/${competition.competition_handle}/add`}
      >
        <fieldset>
          <legend>
            {submission?.submission_id ? "Editar" : "Nova"} Súmula
          </legend>
          <input
            type="hidden"
            name="submission_id"
            value={submission?.submission_id}
          />
          <label htmlFor="stacked-athlete">Atleta</label>
          <input
            id="stacked-athlete"
            name="athlete"
            defaultValue={submission?.athlete}
          />
          <label htmlFor="stacked-division">Categoria</label>
          <select
            id="stacked-division"
            name="division_id"
            defaultValue={submission?.division_id}
          >
            {competition.divisions.map((w) => (
              <option key={w.division_id} value={w.division_id}>
                {w.division_name}
              </option>
            ))}
          </select>
          <label htmlFor="stacked-wod">WOD</label>
          <select
            id="stacked-wod"
            name="wod_id"
            value={wod_id}
            onChange={(e) => setWodId(parseInt(e.target.value))}
          >
            {competition.wods.map((w) => (
              <option key={w.wod_id} value={w.wod_id}>
                {w.wod_name}
              </option>
            ))}
          </select>
          {wod?.wod_config?.map((config, scoreIndex) => (
            <>
              <label htmlFor={`stacked-score-${scoreIndex}`}>
                {config.label}
              </label>
              <input
                {...(config.type === "number" ? { type: "number" } : {})}
                id={`stacked-score-${scoreIndex}`}
                name="scores"
                defaultValue={submission?.scores?.[scoreIndex]}
                placeholder={config.type === "time" ? "12:34" : "123"}
              />
            </>
          ))}
          <label htmlFor="stacked-label">Descrição ranking</label>
          <input
            id="stacked-label"
            name="score_label"
            defaultValue={submission?.score_label}
            placeholder="XX reps"
          />
          <br />
          <button type="submit" className="pure-button pure-button-primary">
            {submission?.submission_id ? "Update" : "Submit"}
          </button>
        </fieldset>
      </form>
    </div>
  );
}

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const athlete = formData.get("athlete");
  const wod_id = formData.get("wod_id");
  const division_id = formData.get("division_id");
  const scores = JSON.stringify(
    formData
      .getAll("scores")
      .map((s) => (String(parseInt(s)) === s ? parseInt(s) : s))
  );
  const score_label = formData.get("score_label");
  const submission_id = formData.get("submission_id");
  await context.api.saveSubmission({
    athlete,
    wod_id,
    division_id,
    scores,
    score_label,
    wod_date: new Date(),
    submission_id,
  });
  return new Response(`
    <html>
      <body>
        <p>Thanks for your submission!</p>
      </body>
    </html>
  `);
};
