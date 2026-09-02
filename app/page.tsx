import { getChatGPTUser } from "./chatgpt-auth";
import { ProductWorkspace } from "./workspace";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  const cookieStore = await cookies();
  const hasSession = !!cookieStore.get("trivestack_session")?.value;
  if (!user && !hasSession) redirect("/login");

  return (
    <ProductWorkspace
      user={{
        name: user?.displayName ?? "Workspace user",
        email: user?.email ?? "",
      }}
    />
  );
}
