import { ProductWorkspace } from "./workspace";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const cookieStore = await cookies();
  const hasSession = !!cookieStore.get("trivestack_session")?.value;
  if (!hasSession) redirect("/login");

  return (
    <ProductWorkspace
      user={{
        name: "Workspace user",
        email: "",
      }}
    />
  );
}
