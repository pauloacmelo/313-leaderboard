// About: This script parses the API results for a given championship on CrossX and outputs the box names and counts.
//
// Usage:
//
//   node download_crossx.js <championship_handle>
//
// Example:
//
//   node download_crossx.js ferrogames2024
//
// Output:
//
//   BOX GARRA: 8
//   BOX POWERFIT: 2
//   BOX83: 1
//   AFERRO CROSSFIT: 1
//   PULSO: 1
//   LEGATVM: 1
//   GOMA BOX: 1
//   CROSSBOX 313: 1
//

const PUBLIC_API_URL = "https://api.crossx.com.br/api/public";
const championship_handle = process.argv[2]; // "ferrogames2024";
const championship = await download(
  `${PUBLIC_API_URL}/championships/${championship_handle}`
);
const competitions = championship.championships[0].competitions;
const championship_id = championship.championships[0].id;
const data = (
  await Promise.all(
    competitions.map(({ id }) =>
      download(
        `${PUBLIC_API_URL}/results?championship=${championship_id}&competition=${id}&sub_division=0&limit=70&page=1`
      )
    )
  )
).flatMap((x) => x.athletes.data);
const fullData = data.map((d) => ({
  ...d,
  competition: competitions.find((c) => c.id === d.competition_id),
}));

console.log("# INSCRITOS POR CATEGORIA");
console.log(
  Object.entries(countBy(fullData, (t) => t.competition.name))
    .sort()
    .map(
      ([category, count]) =>
        `${category}: ${count} / ${
          competitions.find((c) => c.name === category).cut_line
        }`
    )
    .join("\n")
);
console.log("\n\n\n");
console.log("# INSCRITOS POR BOX");
console.log(
  Object.entries(countBy(data, (t) => standardizeBoxName(t.team.box?.trim())))
    .sort(([_1, a], [_2, b]) => (a > b ? -1 : a < b ? 1 : 0))
    .map(([box, count]) => `${box}: ${count}`)
    .join("\n")
);

function standardizeBoxName(input) {
  return (
    {
      // Ferro Games 2024
      ["BOX GARRAB"]: "BOX GARRA",
      ["CROSS BOX 313"]: "CROSSBOX 313",
      ["CROSSBOX313"]: "CROSSBOX 313",
      ["GARRA"]: "BOX GARRA",
      ["GOMA VOX"]: "GOMA BOX",
      ["LEGATVM / CNBOX TAUBATE"]: "LEGATVM",
      ["LEGATVN"]: "LEGATVM",
      ["POWERFIT"]: "BOX POWERFIT",
      ["PULSO/MEGATON "]: "PULSO",
      // Ferro Games 2023
      [" BOX83"]: "BOX83",
      ["AFERRO CROSSFIT / BOX TF"]: "AFERRO CROSSFIT",
      ["ALTO SAO PEDRO"]: "BOX ASP",
      ["ASP/CNB"]: "BOX ASP",
      ["BOX  TAUBATE "]: "BOX TAUBATE",
      ["BOX 83 & CF01 CPV"]: "BOX83",
      ["BOX A.S.P"]: "BOX ASP",
      ["BOX TAUBATÉ"]: "BOX TAUBATE",
      ["CROSS FERROVIÁRIA"]: "CROSS FERRO",
      ["CROSSFERRO"]: "CROSS FERRO",
      ["CROSSFIT MEGATON"]: "MEGATON FITNESS FACTORY",
      ["FERROVIÁRIA "]: "CROSS FERRO",
      ["LEGATVM THE GYM BOX"]: "LEGATVM",
      ["TAQUI CROSSFIT"]: "TAQUI CF",
      ["TEAM MEGATON"]: "MEGATON FITNESS FACTORY",
    }[input] || input
  );
}

async function download(url) {
  return fetch(url).then((response) => response.json());
}
function groupBy(arr, fn) {
  return arr.reduce((acc, cur) => {
    const key = fn(cur);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(cur);
    return acc;
  }, {});
}
function countBy(arr, fn) {
  return Object.fromEntries(
    Object.entries(groupBy(arr, fn)).map(([k, v]) => [k, v.length])
  );
}
