str = require("fs").readFileSync("/Users/pac/Downloads/24_1.txt");
arr = str
  .toString()
  .split("\n")
  .map((r) => r.split(";"));

createClient = require("@libsql/client").createClient;
client = createClient({
  url: "libsql://313-leaderboard-pauloacmelo.turso.io",
  authToken:
    "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3MTA2MTE1NTYsImlkIjoiNmQ5Y2U4YjAtMjI2Ny00NzBiLWFiNGMtNDVhNDE5ODc1Y2Q5In0.XBDAcm69n4JvDHLBANLoU0Yvr4FnM7DoALfcMnR6CwCpJYmXW5Qe5qzhuPi3jxC_EakGzuN1jPw5HjvYICIoBA",
});
await Promise.all(
  arr
    .slice(1)
    .map(async ([_1, athlete, score_label, _2, division_label, category]) => {
      await client.execute({
        sql: `
  insert into submissions (athlete, wod_id, score_number, score_label, wod_date, division_id)
  values ($athlete, $wod_id, $score_number, $score_label, $wod_date, $division_id);
  `,
        args: {
          athlete,
          wod_id: 5,
          division_id:
            division_label === "RX"
              ? category === "MEN"
                ? 1
                : 2
              : category === "MEN"
              ? 3
              : 4,
          score_number: calcScore(score_label),
          score_label,
          wod_date: Date.now(),
        },
      });
    })
);
function calcScore(score_label) {
  if (!score_label.includes(":")) return parseInt(score_label) - 180;
  const [min, sec] = score_label.split(":").map((x) => parseInt(x));
  return 15 * 60 - min * 60 - sec;
}
