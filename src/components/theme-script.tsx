// Runs before paint so a saved theme never flashes. Only reads localStorage;
// system preference is handled by CSS when nothing is saved.
const script = `(function(){try{var t=localStorage.getItem("readeasy:theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
