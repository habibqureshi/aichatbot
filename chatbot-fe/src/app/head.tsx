export default function Head() {
  return (
    <>
      {/* Explicit favicon links as a fallback for browsers that don't pick up the Metadata API */}
      <link rel="icon" href="/favicon.ico" />
      <link rel="icon" type="image/png" href="/favicon-v2.png" />
      <link rel="shortcut icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/favicon-v2.png" />
      <meta name="theme-color" content="#ffffff" />
    </>
  );
}
