import type {
  ActionFunctionArgs,
  LinksFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/cloudflare";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { redirect } from "react-router";
import { assocPath, move } from "ramda";

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
  {
    rel: "stylesheet",
    href: "https://cdn.jsdelivr.net/npm/purecss@3.0.0/build/pure-min.css",
  },
];

type WodConfig = {
  label: string;
  type: string;
  order: string;
};
type Wod = {
  wod_name: string;
  wod_description: string;
  wod_config: WodConfig[];
};
type Competition = {
  competition_id: string;
  competition_name: string;
  competition_handle: string;
  wods: Wod[];
  divisions: {
    division_name: string;
    division_id: number;
  }[];
};
const EMPTY_WOD_CONFIG: WodConfig = { label: "", type: "time", order: "asc" };
const EMPTY_WOD: Wod = {
  wod_name: "",
  wod_description: "",
  wod_config: [{ label: "", type: "time", order: "asc" }],
};

export const loader = async ({ context, request }: LoaderFunctionArgs) => {
  if (!(await context.getUserId())) return redirect("/");
  const searchParams = new URL(request.url).searchParams;
  const competition: Competition = searchParams.get("handle")
    ? await context.api.loadCompetitionByHandle(searchParams.get("handle"))
    : {
        competition_name: searchParams.get("competition_name"),
        competition_handle: searchParams
          .get("competition_name")
          ?.replaceAll(/[^a-zA-Z]/g, ""),
        wods: [
          {
            wod_name: "",
            wod_description: "",
            wod_config: [EMPTY_WOD_CONFIG],
          },
        ],
        divisions: [""],
      };
  return {
    competition,
  };
};
export default function Index() {
  const { competition } = useLoaderData<typeof loader>() as {
    competition: Competition;
  };
  const fetcher = useFetcher();
  const [divisions, setDivisions] = useState(competition.divisions);
  const [name, setName] = useState(competition.competition_name);
  const [wods, setWods] = useState(competition.wods);
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
        <h1>{name}</h1>
        <a href={"/"}>Voltar</a>
      </div>
      <form className="pure-form pure-form-stacked">
        <fieldset>
          <legend>
            {competition?.competition_id ? "Editar" : "Nova"} Competição
          </legend>
          <label htmlFor="stacked-name">Nome</label>
          <input
            id="stacked-name"
            name="competition_name"
            value={name}
            onChange={(evt) => setName(evt.target.value)}
          />
          <label htmlFor="stacked-divisions">Categorias</label>
          {[...divisions, { division_id: 0, division_name: "" }].map(
            (division, index) => (
              <input
                id={`stacked-division-${index}`}
                name="divisions"
                value={division?.division_name}
                onChange={(evt) =>
                  setDivisions(
                    assocPath(
                      [index, "division_name"],
                      evt.target.value,
                      divisions
                    )
                  )
                }
              />
            )
          )}
          <label htmlFor="stacked-wods">WODs</label>
          {[...wods, { wod_id: 0, wod_name: "" }].flatMap((wod, index) => [
            <input
              key={`wod-name-${index}`}
              id={`stacked-wod-${index}`}
              name="wods"
              placeholder={index >= wods.length ? "Novo WOD" : ""}
              value={wod?.wod_name}
              onChange={(evt) =>
                setWods(assocPath([index, "wod_name"], evt.target.value, wods))
              }
            />,
            ...(wod.wod_config || [])
              .concat({ label: "", type: "time", order: "asc" })
              .map((config, configIndex) => (
                <div
                  key={`wod-${index}-config-${configIndex}`}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <span
                    onClick={() =>
                      console.log("up", configIndex, wod.wod_config) ||
                      setWods(
                        assocPath(
                          [index, "wod_config"],
                          move(configIndex, configIndex - 1, wod.wod_config),
                          wods
                        )
                      )
                    }
                  >
                    ⬆️
                  </span>
                  <span
                    onClick={() =>
                      console.log("down", configIndex, wod.wod_config) ||
                      setWods(
                        assocPath(
                          [index, "wod_config"],
                          move(configIndex, configIndex + 1, wod.wod_config),
                          wods
                        )
                      )
                    }
                  >
                    ⬇️
                  </span>
                  <input
                    id={`stacked-wod-${index}-config-${configIndex}`}
                    name="wod_configs"
                    placeholder={
                      configIndex >= (wod.wod_config?.length || 0)
                        ? "Nova métrica"
                        : ""
                    }
                    value={config.label}
                    onChange={(evt) =>
                      setWods(
                        assocPath(
                          [index, "wod_config", configIndex, "label"],
                          evt.target.value,
                          wods
                        )
                      )
                    }
                  />
                  <select
                    name="wod_configs"
                    value={config.type}
                    onChange={(evt) =>
                      setWods(
                        assocPath(
                          [index, "wod_config", configIndex, "type"],
                          evt.target.value,
                          wods
                        )
                      )
                    }
                  >
                    <option value="time">Tempo</option>
                    <option value="number">Número</option>
                    <option value="text">Texto</option>
                  </select>
                  <select
                    name=""
                    value={config.order}
                    onChange={(evt) =>
                      setWods(
                        assocPath(
                          [index, "wod_config", configIndex, "order"],
                          evt.target.value,
                          wods
                        )
                      )
                    }
                  >
                    <option value="desc">Maior é melhor</option>
                    <option value="asc">Menor é melhor</option>
                  </select>
                </div>
              )),
          ])}

          <br />
          <button className="pure-button pure-button-primary" onClick={submit}>
            {competition?.competition_id ? "Update" : "Submit"}
          </button>
        </fieldset>
      </form>
    </div>
  );
  function submit() {
    fetcher.submit(
      {
        competition_id: competition.competition_id,
        competition_handle: competition.competition_handle,
        competition_name: name,
        divisions: JSON.stringify(divisions),
        wods: JSON.stringify(wods),
      },
      { action: "/add", method: "post" }
    );
  }
}

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const formData = await request.formData();
  console.log(formData);
  const competition_id = formData.get("competition_id");
  const competition_name = formData.get("competition_name");
  const competition_handle = formData.get("competition_handle");
  const divisions = JSON.parse(formData.get("divisions"));
  const wods = JSON.parse(formData.get("wods"));
  console.log({
    competition_id,
    competition_name,
    competition_handle,
    divisions,
    wods,
  });
  await context.api.saveCompetition({
    competition_id,
    competition_name,
    competition_handle,
    ...(competition_handle ? { competition_handle } : {}),
  });
  return new Response(`
    <html>
      <body>
        <p>Thanks for your submission!</p>
      </body>
    </html>
  `);
};
