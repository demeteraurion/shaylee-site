document.querySelectorAll("[data-track]").forEach((link) => {
  link.addEventListener("click", () => {
    const detail = {
      event: link.dataset.track,
      project: link.dataset.project || "",
      destination: link.href,
      page: location.pathname
    };

    window.dispatchEvent(new CustomEvent("site:track", { detail }));

    if (typeof window.gtag === "function") {
      window.gtag("event", detail.event, {
        project_id: detail.project,
        destination_url: detail.destination,
        page_path: detail.page
      });
    }
  });
});
