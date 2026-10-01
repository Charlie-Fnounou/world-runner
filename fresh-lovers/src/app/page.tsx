import { Hero } from "@/components/home/Hero";
import { Shelf } from "@/components/home/Shelf";
import { ProductReel } from "@/components/home/ProductReel";
import { GreekSequence } from "@/components/home/GreekSequence";
import { House } from "@/components/home/House";
import { Story } from "@/components/home/Story";
import { Kosher } from "@/components/home/Kosher";
import { Stores } from "@/components/home/Stores";
import { Contact } from "@/components/home/Contact";
import { JsonLd } from "@/components/JsonLd";
import { faqs } from "@/data/faqs";
import { site } from "@/data/site";

export default function Home() {
  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: site.name,
            legalName: site.legalName,
            url: site.url,
            email: site.email,
            telephone: site.phoneE164,
            foundingDate: String(site.since),
            sameAs: [`https://www.instagram.com/${site.instagram}/`],
            address: {
              "@type": "PostalAddress",
              streetAddress: site.plant.line1,
              addressLocality: site.plant.locality,
              addressRegion: site.plant.region,
              addressCountry: "PA",
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]}
      />
      <Hero />
      <ProductReel />
      <Shelf />
      <GreekSequence />
      <House />
      <Story />
      <Kosher />
      <Stores />
      <Contact />
    </>
  );
}
