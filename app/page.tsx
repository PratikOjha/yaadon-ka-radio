import PlayerShell from "./player-shell";
import Clock from "./clock";

export default function HomePage() {
  return (
    <main className="relative flex min-h-dvh flex-1 flex-col items-center justify-between overflow-hidden">
      <div aria-hidden="true" className="hero-bg fixed inset-0 -z-20 bg-cover bg-center">
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/80" />
      </div>

      <div aria-hidden="true" className="grain-overlay pointer-events-none fixed inset-0 -z-10 mix-blend-overlay opacity-30" />

      <header className="fixed safe-top safe-left safe-right z-20 flex items-center justify-between gap-4 text-[11px] uppercase tracking-[0.18em] text-white/75">
        <div className="min-w-[96px]">
          <span className="hidden sm:inline">IST · </span><Clock />
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-black/20 px-3 py-1.5 backdrop-blur-md">
          <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent shadow-[0_0_10px_rgba(227,173,69,.9)]" />
          236 listeners
        </div>
        <nav className="flex items-center gap-3 sm:gap-4" aria-label="Social links">
          <a className="transition hover:text-white" href="https://www.instagram.com/mageinto_technologies/" target="_blank" rel="noreferrer">IG</a>
        </nav>
      </header>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-[42%] bg-gradient-to-t from-black/65 to-transparent" />
      <PlayerShell />
    </main>
  );
}

