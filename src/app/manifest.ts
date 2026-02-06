import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Correct?",
    short_name: "Correct?",
    description: "Statement-based betting platform",
    start_url: "/",
    display: "standalone",
    background_color: "#86253E",
    theme_color: "#86253E",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png"
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png"
      }
    ]
  }
}
