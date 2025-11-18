// ---------- CONFIG ----------
const TMDB_API_KEY = "8161c3d1cca0cd93789eb2eb4375a586";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

// ---------- helpers ----------
async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.error("Fetch error:", err);
    return null;
  }
}

// ---------- rows config ----------
const rowsConfig = [
  { key: "trending", title: "Trending Today", endpoint: () => `${TMDB_BASE}/trending/movie/day?api_key=${TMDB_API_KEY}` },
  { key: "popular", title: "Popular", endpoint: () => `${TMDB_BASE}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1` },
  { key: "top_rated", title: "Top Rated", endpoint: () => `${TMDB_BASE}/movie/top_rated?api_key=${TMDB_API_KEY}&language=en-US&page=1` },
  { key: "upcoming", title: "Upcoming", endpoint: () => `${TMDB_BASE}/movie/upcoming?api_key=${TMDB_API_KEY}&language=en-US&page=1` },
];

// ---------- render row (horizontal) ----------
async function loadRow(config) {
  const container = document.getElementById(`row-${config.key}`);
  if (!container) return;
  container.innerHTML = `<p style="color:#aaa; padding:12px">Loading...</p>`;
  if (!TMDB_API_KEY || TMDB_API_KEY.includes("YOUR_TMDB")) {
    container.innerHTML = `<p style="color:#aaa; padding:12px">TMDB API key missing. Update netflix.js</p>`;
    return;
  }
  const data = await fetchJSON(config.endpoint());
  const movies = data && data.results ? data.results : [];
  container.innerHTML = "";
  movies.forEach(m => {
    const card = document.createElement("div");
    card.className = "slide";
    card.tabIndex = 0;
    card.dataset.movieId = m.id;

    const img = document.createElement("img");
    img.src = m.poster_path ? (TMDB_IMG + m.poster_path) : "netflix_tv.png";
    img.alt = m.title || "";

    const title = document.createElement("div");
    title.className = "slide-title";
    title.textContent = m.title || "";

    card.appendChild(img);
    card.appendChild(title);

    // click / keyboard
    card.addEventListener("click", () => openMovieModal(m.id));
    card.addEventListener("keydown", e => { if (e.key === "Enter") openMovieModal(m.id); });

    container.appendChild(card);
  });
}

// ---------- initial rows load ----------
function loadAllRows() {
  rowsConfig.forEach(cfg => loadRow(cfg));
}

// ---------- search + grid ----------
let currentPage = 1;
let currentQuery = "";
const moviesGrid = document.getElementById("movies-grid");
const loadMoreBtn = document.getElementById("load-more");

async function fetchMovies(page = 1, query = "") {
  if (!TMDB_API_KEY || TMDB_API_KEY.includes("YOUR_TMDB")) {
    console.warn("TMDB API key missing.");
    return [];
  }
  if (query && query.trim()) {
    const q = encodeURIComponent(query.trim());
    const url = `${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&language=en-US&page=${page}&query=${q}`;
    const data = await fetchJSON(url);
    return data && data.results ? data.results : [];
  } else {
    const url = `${TMDB_BASE}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`;
    const data = await fetchJSON(url);
    return data && data.results ? data.results : [];
  }
}

function renderMovies(movies, append = false) {
  if (!append) moviesGrid.innerHTML = "";
  if (!movies || movies.length === 0) {
    if (!append) moviesGrid.innerHTML = `<p style="color:#ccc">No movies found.</p>`;
    return;
  }
  movies.forEach(m => {
    const card = document.createElement("div");
    card.className = "movie-card slide"; // reuse slide styles
    card.tabIndex = 0;
    card.dataset.movieId = m.id;

    const poster = document.createElement("img");
    poster.src = m.poster_path ? (TMDB_IMG + m.poster_path) : "netflix_tv.png";
    poster.alt = m.title || "";

    const title = document.createElement("div");
    title.className = "slide-title";
    title.textContent = m.title || "";

    card.appendChild(poster);
    card.appendChild(title);

    card.addEventListener("click", () => openMovieModal(m.id));
    card.addEventListener("keydown", e => { if (e.key === "Enter") openMovieModal(m.id); });

    moviesGrid.appendChild(card);
  });
}

async function showInitialPopular() {
  currentPage = 1;
  currentQuery = "";
  moviesGrid.innerHTML = `<p style="color:#999">Loading movies...</p>`;
  const movies = await fetchMovies(currentPage, currentQuery);
  renderMovies(movies, false);
}

loadMoreBtn.addEventListener("click", async () => {
  currentPage++;
  const movies = await fetchMovies(currentPage, currentQuery);
  renderMovies(movies, true);
});

const searchInput = document.getElementById("search-input");
const searchClear = document.getElementById("search-clear");
searchInput.addEventListener("keydown", async (e) => {
  if (e.key === "Enter") {
    currentQuery = searchInput.value.trim();
    currentPage = 1;
    moviesGrid.innerHTML = `<p style="color:#999">Searching...</p>`;
    const movies = await fetchMovies(currentPage, currentQuery);
    renderMovies(movies, false);
  }
});
searchClear.addEventListener("click", () => {
  searchInput.value = "";
  currentQuery = "";
  showInitialPopular();
});

// ---------- modal & trailer ----------
const modal = document.getElementById("movie-modal");
const modalBackdrop = document.getElementById("movie-modal-backdrop");
const modalTitle = document.getElementById("modal-title");
const modalOverview = document.getElementById("modal-overview");
const modalVideo = document.getElementById("modal-video");
const modalMeta = document.getElementById("modal-meta");
const modalClose = document.getElementById("modal-close");

async function openMovieModal(movieId) {
  modal.setAttribute("aria-hidden", "false");
  modalTitle.textContent = "Loading...";
  modalOverview.textContent = "";
  modalVideo.innerHTML = "";
  modalMeta.textContent = "";

  // details
  const detail = await fetchJSON(`${TMDB_BASE}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US`);
  if (detail) {
    modalTitle.textContent = detail.title || "Movie";
    modalOverview.textContent = detail.overview || "";
    modalMeta.innerHTML = `<strong>Release:</strong> ${detail.release_date || "N/A"} · <strong>Rating:</strong> ${detail.vote_average || "N/A"}`;
  } else {
    modalTitle.textContent = "Unable to load details";
  }

  // videos
  const videoData = await fetchJSON(`${TMDB_BASE}/movie/${movieId}/videos?api_key=${TMDB_API_KEY}&language=en-US`);
  if (videoData && videoData.results && videoData.results.length > 0) {
    const trailer = videoData.results.find(v => v.site === "YouTube" && v.type === "Trailer") ||
                    videoData.results.find(v => v.site === "YouTube");
    if (trailer) {
      const key = trailer.key;
      // muted autoplay would require user interaction; keep normal embed
      modalVideo.innerHTML = `<iframe src="https://www.youtube.com/embed/${key}" title="Trailer" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    } else {
      modalVideo.innerHTML = `<p style="color:#ddd">Trailer not available (non-YouTube video).</p>`;
    }
  } else {
    modalVideo.innerHTML = `<p style="color:#ddd">Trailer not available.</p>`;
  }
}

function closeModal() {
  modal.setAttribute("aria-hidden", "true");
  modalVideo.innerHTML = "";
}

modalClose.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", closeModal);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

// ---------- FAQ accordion ----------
document.addEventListener("click", (e) => {
  if (e.target && e.target.classList && e.target.classList.contains("FAQ__title")) {
    const btn = e.target;
    const panel = btn.nextElementSibling;
    const icon = btn.querySelector(".icon");
    if (panel.style.maxHeight) {
      panel.style.maxHeight = null;
      if (icon) icon.textContent = "+";
    } else {
      panel.style.maxHeight = panel.scrollHeight + "px";
      if (icon) icon.textContent = "−";
    }
  }
});

// ---------- bootstrap ----------
document.addEventListener("DOMContentLoaded", () => {
  loadAllRows();
  showInitialPopular();

  const getBtn = document.getElementById("get-started");
  if (getBtn) {
    getBtn.addEventListener("click", () => {
      const email = document.getElementById("email").value;
      if (!email) { alert("Please enter an email address"); return; }
      alert("Thanks! We'll send details to: " + email);
    });
  }
});
