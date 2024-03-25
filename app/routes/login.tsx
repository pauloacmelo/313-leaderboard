import type {
  ActionFunctionArgs,
  LinksFunction,
  LoaderFunctionArgs,
} from "@remix-run/cloudflare";
import { redirect } from "@remix-run/react";

export const links: LinksFunction = () => [
  {
    rel: "stylesheet",
    href: "https://cdn.jsdelivr.net/npm/purecss@3.0.0/build/pure-min.css",
  },
];

export const loader = async ({ context }: LoaderFunctionArgs) => {
  const session = await context.getSession();
  if (session.get("userId")) return redirect("/");
  return {};
};
export default function Index() {
  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        lineHeight: "1.8",
        maxWidth: 1000,
        margin: "0 auto",
      }}
    >
      <h1>Login</h1>

      <form
        action="/login"
        className="pure-form pure-form-stacked"
        method="post"
      >
        <fieldset>
          <label htmlFor="stacked-user">User</label>
          <input id="stacked-user" name="user" />
          <label htmlFor="stacked-password">Password</label>
          <input type="password" id="stacked-password" name="password" />
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
  const [user, password] = [
    formData.get("user"),
    formData.get("password"),
  ] as string[];
  const session = await context.getSession();
  await session.set("userId", 1);
  if (user !== "crossbox313" || password !== "open2024")
    return redirect("/login");
  return redirect("/", {
    headers: {
      "Set-Cookie": await context.commitSession(session),
    },
  });
};
