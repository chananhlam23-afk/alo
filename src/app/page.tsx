import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");

  const role = (session.user as { role?: string }).role ?? "CUSTOMER";

  if (role === "ADMIN") redirect("/admin");
  if (role === "DRIVER") redirect("/driver");
  redirect("/customer");
}
