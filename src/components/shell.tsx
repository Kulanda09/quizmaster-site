import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, isPending } = useCurrentUserState();

  return (
    <div className="min-h-screen">
      <header className="glass sticky top-0 z-20 border-b border-line/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="font-mono text-xs tracking-[0.22em] text-signal">QM</span>
            <span className="text-lg font-semibold tracking-tight">QuizMaster</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link to="/" className="hidden text-muted hover:text-fg sm:inline">
              Пәндер
            </Link>
            <Link to="/battle" className="hidden text-muted hover:text-fg sm:inline">
              Баттл
            </Link>
            <Link to="/join" className="text-muted hover:text-fg">
              Код
            </Link>
            {user ? (
              <>
                <Link to="/create" className="font-semibold text-signal hover:text-fg">
                  AI
                </Link>
                <Link to="/pro" className="hidden text-muted hover:text-fg sm:inline">
                  Pro
                </Link>
                <Link to="/cabinet" className="text-muted hover:text-fg">
                  Кабинет
                </Link>
              </>
            ) : null}
            <div className="min-h-8 min-w-24">
              {isPending ? (
                <div className="h-8 w-28 animate-pulse rounded-full bg-panel-2" />
              ) : user ? (
                <UserButton />
              ) : (
                <Link
                  to="/login"
                  className="inline-flex h-10 items-center rounded-full bg-signal px-4 font-semibold text-signal-ink"
                >
                  Кіру
                </Link>
              )}
            </div>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
