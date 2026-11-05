export function Scene() {
  return (
    <div className="pointer-events-none relative mx-auto h-[460px] w-full max-w-lg" aria-hidden="true">
      <span className="star-bit absolute left-6 top-4" />
      <span className="star-bit absolute right-8 top-16 opacity-70" />
      <span className="star-bit absolute bottom-24 left-16" />
      <div className="pedestal" />
      <div className="absolute left-1/2 top-[42%] h-44 w-44 -translate-x-1/2 -translate-y-1/2" style={{ perspective: "900px" }}>
        <div className="scene-spin absolute left-1/2 top-1/2 h-36 w-36">
          <div className="cube-face cube-front bg-white text-signal-ink">QM</div>
          <div className="cube-face cube-back bg-signal text-white">XP</div>
          <div className="cube-face cube-right bg-white text-signal-ink">A+</div>
          <div className="cube-face cube-left bg-panel-2 text-white">IT</div>
          <div className="cube-face cube-top bg-white text-signal">★</div>
          <div className="cube-face cube-bottom bg-signal text-white">3D</div>
        </div>
      </div>
      <div className="float-a absolute left-1 top-8 sm:left-6">
        <div className="cap">
          <div className="cap-board" />
          <div className="cap-top" />
          <div className="cap-tassel" />
        </div>
      </div>
      <div className="float-b absolute right-1 top-12 sm:right-6">
        <div className="book" />
      </div>
      <div className="float-c absolute bottom-10 left-6">
        <div className="medal">
          <span>★</span>
        </div>
      </div>
      <div className="float-b absolute bottom-16 right-6">
        <div className="q-orb">?</div>
      </div>
    </div>
  );
}
