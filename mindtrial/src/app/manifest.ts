import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MINDTRIAL",
    short_name: "MINDTRIAL",
    description: "Free browser games, brain challenges, physics toys and local multiplayer party games.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3eee3",
    theme_color: "#f3eee3",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
