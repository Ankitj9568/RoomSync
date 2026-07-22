const navbarHTML = `
<!-- Mobile Header (Hidden on Desktop) -->
<div class="d-lg-none bg-white shadow-sm p-3 d-flex justify-content-between align-items-center sticky-top">
  <a class="navbar-brand d-flex align-items-center text-decoration-none mb-0" href="/pages/dashboard.html">
      <i class="bi bi-house-door-fill me-2 fs-3 text-primary-custom"></i>
      <span class="fs-4 fw-bold text-primary-custom">RoomSync</span>
  </a>
  <button class="btn btn-outline-secondary border-0" type="button" data-bs-toggle="offcanvas" data-bs-target="#sidebarOffcanvas" aria-controls="sidebarOffcanvas">
    <i class="bi bi-list fs-1 text-dark"></i>
  </button>
</div>

<!-- Sidebar / Offcanvas Drawer -->
<div class="offcanvas-lg offcanvas-start sidebar bg-white d-flex flex-column" tabindex="-1" id="sidebarOffcanvas" aria-labelledby="sidebarOffcanvasLabel">
  
  <!-- Offcanvas Header for Mobile -->
  <div class="offcanvas-header d-lg-none border-bottom p-3">
    <a class="navbar-brand d-flex align-items-center text-decoration-none" href="/pages/dashboard.html">
        <i class="bi bi-house-door-fill me-2 fs-4 text-primary-custom"></i>
        <span class="fs-4 fw-bold text-primary-custom">RoomSync</span>
    </a>
    <button type="button" class="btn-close" data-bs-dismiss="offcanvas" data-bs-target="#sidebarOffcanvas" aria-label="Close"></button>
  </div>

  <!-- Header for Desktop -->
  <div class="offcanvas-header d-none d-lg-flex p-4 pb-2">
      <a class="navbar-brand d-flex align-items-center text-decoration-none w-100" href="/pages/dashboard.html">
          <i class="bi bi-house-door-fill me-2 fs-4 text-primary-custom"></i>
          <span class="fs-4 fw-bold text-primary-custom">RoomSync</span>
      </a>
  </div>
  <hr class="d-none d-lg-block mx-4 mt-2 mb-2">
      
  <!-- Nav Links -->
  <div class="offcanvas-body p-3 d-flex flex-column overflow-y-auto">
    <ul class="nav nav-pills flex-column mb-auto w-100">
      <li class="nav-item">
        <a class="nav-link" href="/pages/dashboard.html"><i class="bi bi-grid-1x2 me-3"></i> Dashboard</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" href="/pages/groceries.html"><i class="bi bi-cart me-3"></i> Groceries</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" href="/pages/shopping-list.html"><i class="bi bi-list-check me-3"></i> Shopping List</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" href="/pages/meals.html"><i class="bi bi-cup-hot me-3"></i> Meals</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" href="/pages/expenses.html"><i class="bi bi-receipt me-3"></i> Expenses</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" href="/pages/settlements.html"><i class="bi bi-arrow-left-right me-3"></i> Settlements</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" href="/pages/analytics.html"><i class="bi bi-graph-up me-3"></i> Analytics</a>
      </li>
    </ul>
    
    <hr class="mt-3 mb-3 w-100 border-secondary opacity-25">
    <ul class="nav nav-pills flex-column w-100">
      <li class="nav-item">
        <a class="nav-link" href="/pages/settings.html"><i class="bi bi-gear me-3"></i> Settings</a>
      </li>
    </ul>
  </div>
</div>
`;

document.addEventListener("DOMContentLoaded", () => {
    // Inject Sidebar
    const navPlaceholder = document.getElementById("navbar-placeholder");
    if (navPlaceholder) {
        navPlaceholder.innerHTML = navbarHTML;
        document.body.classList.add('has-sidebar');
    }

    // Set Active State
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.sidebar .nav-link');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
            link.classList.remove('text-dark');
        } else {
            link.classList.add('text-dark');
        }
    });
});
