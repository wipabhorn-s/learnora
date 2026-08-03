import { GraduationCap } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-foreground py-10 text-white/70">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-6 md:flex-row">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <GraduationCap size={14} className="text-white" />
            </div>
            <span className="text-lg font-extrabold text-white">
              Learn<span className="text-violet-400">ora</span>
            </span>
          </div>
          <p className="max-w-xs text-sm">
            Expert-led courses with flexible access plans, ready whenever you
            are.
          </p>
        </div>

        <div className="flex flex-wrap gap-12 text-sm">
          <div>
            <h4 className="mb-3 font-semibold text-white">Platform</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/courses"
                  className="transition-colors hover:text-white"
                >
                  Courses
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-semibold text-white">Instructors</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/signup?role=INSTRUCTOR"
                  className="transition-colors hover:text-white"
                >
                  Become an Instructor
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-semibold text-white">Legal</h4>
            <ul className="space-y-2">
              <li>
                <span className="cursor-default">Terms of Service</span>
              </li>
              <li>
                <span className="cursor-default">Privacy Policy</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-7xl border-t border-white/10 px-6 pt-6 text-center text-sm">
        © 2026 Learnora. All rights reserved.
      </div>
    </footer>
  );
}
