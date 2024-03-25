import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/react";

export const loader = async ({ request, context }: ActionFunctionArgs) => {
  const session = await context.getSession();
  await context.destroySession(session);
  return redirect("/", {
    headers: {
      "Set-Cookie": await context.commitSession(session),
    },
  });
};
