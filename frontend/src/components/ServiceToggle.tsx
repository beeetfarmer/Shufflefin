import { motion } from "framer-motion";

type Service = "jellyfin" | "plex";

interface ServiceToggleProps {
  value: Service;
  onChange: (service: Service) => void;
  availableServices?: { jellyfin: boolean; plex: boolean };
}

const ServiceToggle = ({ value, onChange, availableServices }: ServiceToggleProps) => {
  const services = (["jellyfin", "plex"] as const).filter(
    (s) => !availableServices || availableServices[s]
  );

  if (services.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 p-1 rounded-xl bg-secondary/50 border border-border/50">
      {services.map((service) => (
        <button
          key={service}
          onClick={() => onChange(service)}
          className="relative px-5 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
        >
          {value === service && (
            <motion.div
              layoutId="service-bg"
              className="absolute inset-0 rounded-lg bg-primary/15 border border-primary/30 glow-border"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span
            className={`relative z-10 capitalize ${
              value === service ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {service === "jellyfin" ? "Jellyfin" : "Plex"}
          </span>
        </button>
      ))}
    </div>
  );
};

export default ServiceToggle;
