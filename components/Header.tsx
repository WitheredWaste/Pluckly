import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export default function Header() {
  return (
    <header className="border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-serif tracking-tight">
          Pluckly
        </Link>
        <nav className="flex items-center gap-8">
          <Link
            href="/tools"
            className="text-sm hover:text-accent transition-colors"
          >
            Tools
          </Link>
          <Link
            href="/categories"
            className="text-sm hover:text-accent transition-colors"
          >
            Categories
          </Link>
          <Link
            href="/articles"
            className="text-sm hover:text-accent transition-colors"
          >
            Articles
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
