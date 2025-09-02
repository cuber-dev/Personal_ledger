(function guardVaultAccess() {
  const unlocked = sessionStorage.getItem("vaultUnlocked") === "true";
  if (!unlocked) {
    window.location.href = "/index.html"; // fallback route
  }
})();