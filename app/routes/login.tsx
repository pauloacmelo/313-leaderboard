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

export const loader = async ({ context, request }: LoaderFunctionArgs) => {
  if (await context.getUserId()) return redirect("/");
  const searchParams = new URL(request.url).searchParams;
  const token = searchParams.get("token");
  if (!token) return {};
  const jwtUser = context.jwt.decryptJWT(token) || {};
  const user_email = jwtUser?.user_email;
  if (!user_email) return {};
  const [user] = await context.api.loadUsers({ user_email });
  if (user?.user_id !== jwtUser?.user_id) return {};
  const session = await context.getSession();
  await session.set("userId", user?.user_id);
  return redirect("/", {
    headers: {
      "Set-Cookie": await context.commitSession(session),
    },
  });

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

      <div style={{ display: "flex", flexDirection: "row" }}>
        <form
          action="/login"
          className="pure-form pure-form-stacked"
          method="post"
          style={{ width: "50%" }}
        >
          <fieldset>
            <input type="hidden" name="type" defaultValue="passwordfull" />
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
        <form
          action="/login"
          className="pure-form pure-form-stacked"
          method="post"
          style={{ width: "50%" }}
        >
          <input type="hidden" name="type" defaultValue="passwordless" />
          <label htmlFor="stacked-user">Email</label>
          <input type="email" id="stacked-user" name="user" />
          <br />
          <button type="submit" className="pure-button pure-button-primary">
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const [type, user, password] = [
    formData.get("type"),
    formData.get("user"),
    formData.get("password"),
  ] as string[];
  if (type !== "passwordfull" && type !== "passwordless")
    return redirect("/login");
  const session = await context.getSession();
  if (type === "passwordfull") {
    await session.set("userId", 1);
    if (user !== "crossbox313" || password !== "open2024")
      return redirect("/login");
  } else if (type === "passwordless") {
    const [dbUser] = await context.api.loadUsers({ user_email: user });
    if (dbUser) {
      const token = context.jwt.encryptJWT({
        ...dbUser,
        exp: (Date.now() + 1000 * 60 * 30) / 1000, // 30 minute expiring
      });
      await context.sendEmail({
        to: user,
        subject: `Crossbox 313 - Login - ${new Date().toString().slice(4, 10)}`,
        html: `
          <p>Clique no seguinte <a href="${
            new URL(request.url).origin
          }/login?token=${token}">link para entrar</a>.</p>
          <br/><br/>
          <i>(Este link é válido por 30 minutos)</i>
        `,
      });
    }
    return redirect("/login");
  }
  return redirect("/", {
    headers: {
      "Set-Cookie": await context.commitSession(session),
    },
  });
};
