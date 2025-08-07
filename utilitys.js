// Dark Mode Toggle
const themeToggle = document.getElementById("themeToggle");
const currentTheme = localStorage.getItem("theme");

if (currentTheme === "dark") {
  document.body.classList.add("dark-mode");
  themeToggle.textContent = "☀️ Toggle Light Mode";
}

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  themeToggle.textContent = isDark ? "☀️ Toggle Light Mode" : "🌙 Toggle Dark Mode";
  localStorage.setItem("theme", isDark ? "dark" : "light");
});