import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fresh Lovers Panamá",
    short_name: "Fresh Lovers",
    start_url: "/",
    display: "standalone",
    background_color: "#f4efe6",
    theme_color: "#141210",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
