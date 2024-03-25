import type {
  ActionFunctionArgs,
  LinksFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
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
        wod_id: searchParams.get("wod_id"),
        athlete: searchParams.get("athlete"),
        score_number: searchParams.get("score_number"),
        score_label: searchParams.get("score_label"),
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
        <a href={`/${competition.competition_handle}`}>Back</a>
      </div>
      <form
        className="pure-form pure-form-stacked"
        method="post"
        action={`/${competition.competition_handle}/add`}
      >
        <fieldset>
          <legend>
            {submission?.submission_id ? "Update" : "Add"} Submission
          </legend>
          <input
            type="hidden"
            name="submission_id"
            value={submission?.submission_id}
          />
          <label htmlFor="stacked-athlete">Athlete</label>
          <input
            id="stacked-athlete"
            name="athlete"
            defaultValue={submission?.athlete}
          />
          <label htmlFor="stacked-wod">WOD</label>
          <select
            id="stacked-wod"
            name="wod_id"
            defaultValue={submission?.wod_id}
          >
            {competition.wods.map((w) => (
              <option key={w.wod_id} value={w.wod_id}>
                {w.wod_name}
              </option>
            ))}
          </select>
          <label htmlFor="stacked-division">Division</label>
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
          <label htmlFor="stacked-score">Score Number</label>
          <input
            type="number"
            id="stacked-score"
            name="score_number"
            defaultValue={submission?.score_number}
          />
          <label htmlFor="stacked-label">Score Label</label>
          <input
            id="stacked-label"
            name="score_label"
            defaultValue={submission?.score_label}
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
  const [
    athlete,
    wod_id,
    division_id,
    score_number,
    score_label,
    submission_id,
  ] = [
    formData.get("athlete"),
    formData.get("wod_id"),
    formData.get("division_id"),
    formData.get("score_number"),
    formData.get("score_label"),
    formData.get("submission_id"),
  ] as string[];
  await context.api.saveSubmission({
    athlete,
    wod_id,
    division_id,
    score_number,
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
