export function ParticleBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <div className="absolute inset-0 mesh-gradient" />
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-background via-background/60 to-transparent" />
    </div>
  );
}
