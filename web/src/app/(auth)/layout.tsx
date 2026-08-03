import Logo from "@/components/shared/Logo";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (session) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-1/2 items-center justify-center bg-linear-to-br from-violet-600 to-purple-800 p-12 lg:flex">
        <div className="max-w-sm space-y-6 text-white">
          <Logo light />
          <h2 className="text-4xl font-extrabold leading-tight">
            Learn new skills, at your own pace
          </h2>
          <p className="leading-relaxed text-white/70">
            Access thousands of expert-led courses and continue learning
            anywhere.
          </p>
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
