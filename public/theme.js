try {
  const theme = localStorage.getItem("steam-shelf-theme");
  document.documentElement.classList.toggle(
    "dark",
    theme
      ? theme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches,
  );
} catch {}
