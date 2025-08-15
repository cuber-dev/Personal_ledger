// Dark Mode Toggle
const themeToggle = document.getElementById("themeToggle");
const currentTheme = localStorage.getItem("theme");

if (currentTheme === "dark") {
  document.body.classList.add("dark-mode");
  themeToggle.innerHTML = `<i class="fa-solid fa-sun"></i> Toggle Light Mode`;
}

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  themeToggle.innerHTML = isDark ? `<i class="fa-solid fa-sun"></i> Toggle Light Mode` : `<i class="fa-solid fa-moon"></i> Toggle Dark Mode`;
  localStorage.setItem("theme", isDark ? "dark" : "light");
});