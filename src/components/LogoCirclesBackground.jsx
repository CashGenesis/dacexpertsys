// Login page background: one vector circle per colour of the BMU logo, drifting slowly.
// Pure SVG + CSS keyframes (no canvas, no images). Motion stops for users who prefer reduced motion.

// One circle per logo colour. Centres sit between 22% and 78% of the screen and each drift
// keyframe moves at most 16vw / 16vh, so a circle travels far but never leaves the screen.
const CIRCLES = [
  // colour,   cx %, cy %, r,  drift animation, duration (s), delay (s)
  { color: '#5cb98f', cx: 22, cy: 28, r: 9, anim: 'bmu-drift-a', dur: 11, delay: 0 }, // green
  { color: '#2fa8e0', cx: 76, cy: 24, r: 8, anim: 'bmu-drift-b', dur: 13, delay: -5 }, // sky blue
  { color: '#fbb040', cx: 78, cy: 74, r: 10, anim: 'bmu-drift-c', dur: 12, delay: -9 }, // amber
  { color: '#3f5ba9', cx: 24, cy: 76, r: 9, anim: 'bmu-drift-d', dur: 14, delay: -3 }, // indigo blue
  { color: '#f26a2e', cx: 52, cy: 78, r: 8, anim: 'bmu-drift-b', dur: 12.5, delay: -11 }, // orange
  { color: '#ec4c6a', cx: 50, cy: 28, r: 8, anim: 'bmu-drift-d', dur: 15, delay: -7 }, // rose
];

export default function LogoCirclesBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes bmu-drift-a {
          0%   { transform: translate(-50%, -50%) translate(0, 0) scale(1); }
          25%  { transform: translate(-50%, -50%) translate(16vw, 8vh) scale(1.1); }
          50%  { transform: translate(-50%, -50%) translate(6vw, 16vh) scale(0.9); }
          75%  { transform: translate(-50%, -50%) translate(-8vw, 6vh) scale(1.05); }
          100% { transform: translate(-50%, -50%) translate(0, 0) scale(1); }
        }
        @keyframes bmu-drift-b {
          0%   { transform: translate(-50%, -50%) translate(0, 0) scale(1); }
          30%  { transform: translate(-50%, -50%) translate(-15vw, 10vh) scale(1.08); }
          60%  { transform: translate(-50%, -50%) translate(-6vw, -12vh) scale(0.92); }
          100% { transform: translate(-50%, -50%) translate(0, 0) scale(1); }
        }
        @keyframes bmu-drift-c {
          0%   { transform: translate(-50%, -50%) translate(0, 0) scale(1); }
          25%  { transform: translate(-50%, -50%) translate(-14vw, -6vh) scale(0.94); }
          55%  { transform: translate(-50%, -50%) translate(-6vw, -16vh) scale(1.1); }
          80%  { transform: translate(-50%, -50%) translate(8vw, -8vh) scale(1); }
          100% { transform: translate(-50%, -50%) translate(0, 0) scale(1); }
        }
        @keyframes bmu-drift-d {
          0%   { transform: translate(-50%, -50%) translate(0, 0) scale(1); }
          30%  { transform: translate(-50%, -50%) translate(12vw, -14vh) scale(1.06); }
          65%  { transform: translate(-50%, -50%) translate(16vw, 6vh) scale(0.92); }
          100% { transform: translate(-50%, -50%) translate(0, 0) scale(1); }
        }
        .bmu-circle {
          position: absolute;
          transform: translate(-50%, -50%);
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          will-change: transform;
          mix-blend-mode: multiply;
        }
        @media (prefers-reduced-motion: reduce) {
          .bmu-circle { animation: none !important; }
        }
      `}</style>
      {/* One small vector per circle, placed by % of the screen, so every circle stays
          visible whatever the window shape. r is a % of the smaller screen side. */}
      {CIRCLES.map((c, index) => {
        const size = `${c.r * 4}vmin`; // diameter plus room for the blur
        const filterId = `bmu-blur-${index}`;
        return (
          <svg
            key={`${c.color}-${c.cx}-${c.cy}`}
            className="bmu-circle"
            viewBox="0 0 100 100"
            width={size}
            height={size}
            style={{
              left: `${c.cx}%`,
              top: `${c.cy}%`,
              animationName: c.anim,
              animationDuration: `${c.dur}s`,
              animationDelay: `${c.delay}s`,
            }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" />
              </filter>
            </defs>
            <circle cx="50" cy="50" r="30" fill={c.color} fillOpacity="0.45" filter={`url(#${filterId})`} />
          </svg>
        );
      })}
    </div>
  );
}
