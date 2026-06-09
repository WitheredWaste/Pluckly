import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="w-7 h-7 rounded-lg bg-accent text-white flex items-center justify-center text-base font-medium leading-none">
            P
          </span>
          <span className="text-xl font-serif tracking-tight">Pluckly</span>
        </Link>
        <nav className="flex items-center gap-8">
          <Link
            href="/tools"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            Tools
          </Link>
          <Link
            href="/categories"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            Categories
          </Link>
          <Link
            href="/articles"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            Articles
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
