import type {
  ActionFunctionArgs,
  LinksFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/cloudflare";
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
  const searchParams = new URL(request.url).searchParams;
  const competition = await context.api.loadCompetitionByHandle(handle);
  const submissions = await context.api.loadSubmissionsByHandle(handle);
  const submission = searchParams.get("id")
    ? submissions.find(
        (s) => String(s.submission_id) === searchParams.get("id")
      )
    : null;
  const athletes = submissions
    .map((s) => s.athlete)
    .reduce((acc, cur) => (acc.indexOf(cur) < 0 ? [...acc, cur] : acc), [])
    .sort();
  return {
    competition,
    athletes,
    submission,
  };
};
export default function Index() {
  const { competition, atheletes, submission } = useLoaderData<typeof loader>();
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
          <legend>Add Submission</legend>
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
            Submit
          </button>
        </fieldset>
      </form>
    </div>
  );
}

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const [athlete, wod_id, score_number, score_label, submission_id] = [
    formData.get("athlete"),
    formData.get("wod_id"),
    formData.get("score_number"),
    formData.get("score_label"),
    formData.get("submission_id"),
  ] as string[];
  await context.api.saveSubmission({
    athlete,
    wod_id,
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
