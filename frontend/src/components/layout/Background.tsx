/** Fixed forest-to-night gradient with two blurred light leaks. */
export function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-forest-950 via-forest-900 to-night-900" />
      <div className="absolute -left-40 -top-40 size-[640px] rounded-full bg-emerald-400/12 blur-[140px]" />
      <div className="absolute -bottom-48 right-[-10%] size-[560px] rounded-full bg-amber-400/8 blur-[150px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.35))]" />
    </div>
  );
}
