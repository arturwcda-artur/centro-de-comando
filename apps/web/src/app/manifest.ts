import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Centro de Comando Gerencial",
    short_name: "Comando",
    description: "Plataforma privada de gestão de obras",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#111a26",
    theme_color: "#111a26",
    icons: [
      { src: "/icones/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icones/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icones/512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
