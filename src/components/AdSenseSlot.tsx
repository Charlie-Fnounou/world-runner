// Espacio para un anuncio de Google AdSense. No hace nada hasta que se
// configure NEXT_PUBLIC_ADSENSE_CLIENT_ID (el "Publisher ID", ca-pub-...)
// como variable de entorno — mientras tanto no se renderiza nada.
export function AdSenseSlot({ slot }: { slot: string }) {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  if (!clientId) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 w-full">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
      <script
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: "(adsbygoogle = window.adsbygoogle || []).push({});" }}
      />
    </div>
  );
}
