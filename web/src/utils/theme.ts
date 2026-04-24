export const updateTheme = () => {
  const theme = localStorage.theme || "system"
  document.documentElement.style.colorScheme =
    theme === "system" ? "light dark" : theme
}
