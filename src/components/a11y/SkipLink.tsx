export function SkipLinks({ toContent, toNav }: { toContent: string; toNav: string }) {
  return (
    <>
      <a className="skip-link" href="#main-content">
        {toContent}
      </a>
      <a className="skip-link" href="#primary-nav">
        {toNav}
      </a>
    </>
  );
}
