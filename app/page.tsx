import { requireChatGPTUser } from "./chatgpt-auth";
import { ProductWorkspace } from "./workspace";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireChatGPTUser("/");
  return <ProductWorkspace user={{ name: user.displayName, email: user.email }} />;
}
