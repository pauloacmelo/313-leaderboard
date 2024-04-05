import type {
  ActionFunctionArgs,
  LinksFunction,
  LoaderFunctionArgs,
} from "@remix-run/cloudflare";
import { redirect, useLoaderData } from "@remix-run/react";

export const links: LinksFunction = () => [
  {
    rel: "stylesheet",
    href: "https://cdn.jsdelivr.net/npm/purecss@3.0.0/build/pure-min.css",
  },
];

export const loader = async ({ context }: LoaderFunctionArgs) => {
  if (!(await context.getUserId())) return redirect("/");
  const users = await context.api.loadUsers();
  return { users };
};
export default function Index() {
  const { users } = useLoaderData<typeof loader>();
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
          margin: "0 10px",
        }}
      >
        <h1>Usuários</h1>
        <a href="/">Voltar</a>
      </div>
      {users.map((user) => (
        <div
          style={{ display: "flex", flexDirection: "row" }}
          key={user.user_id}
        >
          <form action="/users" method="POST">
            <input type="hidden" name="operation" defaultValue="update" />
            <input
              type="email"
              name="user_email"
              defaultValue={user.user_email}
            />
            <input type="hidden" name="user_id" defaultValue={user.user_id} />
            &nbsp;&nbsp;&nbsp;
            <input type="submit" value="Salvar" />
          </form>
          &nbsp;&nbsp;&nbsp;
          <form action="/users" method="POST">
            <input type="hidden" name="operation" defaultValue="destroy" />
            <input type="hidden" name="user_id" defaultValue={user.user_id} />
            <input type="submit" value="Deletar" />
          </form>
        </div>
      ))}
      <form action="/users" method="POST">
        <input type="hidden" name="operation" defaultValue="update" />
        <input type="email" name="user_email" placeholder="Novo usuário" />
        &nbsp;&nbsp;&nbsp;
        <input type="submit" value="Salvar" />
      </form>
    </div>
  );
}

export const action = async ({ request, context }: ActionFunctionArgs) => {
  if (!(await context.getUserId())) return redirect("/");
  const formData = await request.formData();
  const [user_id, user_email, operation] = [
    formData.get("user_id"),
    formData.get("user_email"),
    formData.get("operation"),
  ] as string[];
  if (operation === "update") {
    await context.api.saveUser({ user_id, user_email });
  } else if (operation === "destroy") {
    await context.api.destroyUser({ user_id });
  }
  return redirect("/users");
};
