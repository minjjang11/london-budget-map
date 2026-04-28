export default function Loading() {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-budget-bg px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="mx-auto w-full max-w-[390px] space-y-4">
        <div className="h-8 w-40 animate-pulse rounded-xl bg-budget-surface/80" />
        <div className="h-28 w-full animate-pulse rounded-2xl bg-budget-white shadow-sm ring-1 ring-budget-surface/60" />
        <div className="h-12 w-full animate-pulse rounded-2xl bg-budget-surface/70" />
        <div className="space-y-2 pt-2">
          <div className="h-4 max-w-[280px] w-[72%] animate-pulse rounded-md bg-budget-surface/90" />
          <div className="h-4 w-full animate-pulse rounded-md bg-budget-surface/60" />
          <div className="h-4 max-w-[320px] w-[84%] animate-pulse rounded-md bg-budget-surface/50" />
        </div>
      </div>
    </div>
  );
}
