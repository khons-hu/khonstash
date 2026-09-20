// Apply before styles load. Explicit saved choices take precedence.
(()=>{let saved;try{saved=localStorage.getItem('steam-shelf-theme');}catch{}
const theme=saved==='light'||saved==='dark'?saved:(globalThis.matchMedia?.('(prefers-color-scheme: light)').matches?'light':'dark');
document.documentElement.classList.toggle('dark',theme==='dark');})();
