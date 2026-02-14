import { motion } from "framer-motion";
import { useMemo } from "react";
import { Film, Clapperboard, Popcorn, Tv, MonitorPlay } from "lucide-react";

const ICONS = [Film, Clapperboard, Popcorn, Tv, MonitorPlay];

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  type: "bokeh" | "icon" | "filmstrip";
  iconIndex?: number;
  drift: number;
}

const AnimatedBackground = () => {
  const particles = useMemo<Particle[]>(() => {
    const items: Particle[] = [];

    // Bokeh circles
    for (let i = 0; i < 18; i++) {
      items.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 4 + Math.random() * 80,
        duration: 8 + Math.random() * 12,
        delay: Math.random() * -10,
        opacity: 0.02 + Math.random() * 0.04,
        type: "bokeh",
        drift: (Math.random() - 0.5) * 30,
      });
    }

    // Floating media icons
    for (let i = 0; i < 8; i++) {
      items.push({
        id: 100 + i,
        x: 5 + Math.random() * 90,
        y: Math.random() * 100,
        size: 16 + Math.random() * 20,
        duration: 10 + Math.random() * 12,
        delay: Math.random() * -8,
        opacity: 0.04 + Math.random() * 0.04,
        type: "icon",
        iconIndex: i % ICONS.length,
        drift: (Math.random() - 0.5) * 20,
      });
    }

    // Film strip fragments
    for (let i = 0; i < 5; i++) {
      items.push({
        id: 200 + i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 40 + Math.random() * 60,
        duration: 15 + Math.random() * 10,
        delay: Math.random() * -6,
        opacity: 0.03 + Math.random() * 0.03,
        type: "filmstrip",
        drift: (Math.random() - 0.5) * 15,
      });
    }

    return items;
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Subtle radial gradient base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, hsl(var(--primary) / 0.04) 0%, transparent 70%)",
        }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground) / 0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Particles */}
      {particles.map((p) => {
        if (p.type === "bokeh") {
          return (
            <motion.div
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
                background: `radial-gradient(circle, hsl(var(--primary) / ${p.opacity * 3}) 0%, hsl(var(--primary) / 0) 70%)`,
              }}
              animate={{
                y: [0, -40, 0],
                x: [0, p.drift, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          );
        }

        if (p.type === "icon") {
          const Icon = ICONS[p.iconIndex!];
          return (
            <motion.div
              key={p.id}
              className="absolute text-primary"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                opacity: p.opacity,
              }}
              animate={{
                y: [0, -60, 0],
                x: [0, p.drift, 0],
                rotate: [0, 15, -15, 0],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Icon size={p.size} strokeWidth={1} />
            </motion.div>
          );
        }

        // Filmstrip
        return (
          <motion.div
            key={p.id}
            className="absolute"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              opacity: p.opacity,
            }}
            animate={{
              y: [0, -50, 0],
              x: [0, p.drift, 0],
              rotate: [p.drift, -p.drift, p.drift],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {/* Film strip shape */}
            <div
              className="rounded-md border border-primary/20 overflow-hidden"
              style={{ width: p.size, height: p.size * 1.5 }}
            >
              <div className="flex justify-between px-[2px] py-[1px]">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="w-[4px] h-[3px] rounded-[1px] bg-primary/30" />
                ))}
              </div>
              <div className="flex-1 mx-1 my-[2px] bg-primary/5 rounded-sm" style={{ height: p.size * 1.1 }} />
              <div className="flex justify-between px-[2px] py-[1px]">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="w-[4px] h-[3px] rounded-[1px] bg-primary/30" />
                ))}
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, hsl(var(--background)) 100%)",
        }}
      />
    </div>
  );
};

export default AnimatedBackground;
