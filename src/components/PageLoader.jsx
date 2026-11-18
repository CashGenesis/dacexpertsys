/**
 * The app's page-transition loader: the stationary BMU tree with one rotating
 * multicolour ring around it, and the word "Loading".
 *
 * It is shown only while something is really loading (a page's code chunk via
 * the <Suspense> fallback, or the auth check in ProtectedRoute); there is no
 * delay before it appears and no minimum display time.
 *
 * Styles (.page-loader*) live in public/page-loader.css, linked from index.html,
 * so the identical loader can also be drawn before the JavaScript bundle has
 * loaded; keep this markup in sync with the copy inside #root in index.html.
 *
 * fullScreen: centre in the whole viewport (no layout around it). Otherwise it
 * fills DACLayout's main content area, below the top bar and beside the sidebar.
 */
export default function PageLoader({ fullScreen = false }) {
  return (
    <div
      className={`page-loader ${fullScreen ? 'page-loader--screen' : 'page-loader--content'}`}
      role="status"
      aria-live="polite"
    >
      <div className="page-loader__mark">
        <span className="page-loader__ring" aria-hidden="true" />
        <img className="page-loader__tree" src="/loader-tree.png" alt="" width="263" height="276" decoding="async" />
      </div>
      <p className="page-loader__label">Loading</p>
    </div>
  );
}
