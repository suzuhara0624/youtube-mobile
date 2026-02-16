// ----- this is version 0.04 -----



let player;

const DEFAULT_VIDEO_ID = "zeGYRwOJOho";

// ================= URL helpers =================
function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// ================= YouTube API =================
function onYouTubeIframeAPIReady() {
  const videoId = getQueryParam("v") || DEFAULT_VIDEO_ID;
  const timeParam = getQueryParam("t");

 player = new YT.Player("player", {
  videoId: videoId,
  playerVars: {
    playsinline: 1,
    mute: 1   // 👈 THIS is the key for mobile
  },
  events: {
    onReady: () =>{

      if (timeParam) {
        const seconds = parseTime(timeParam);
        if (seconds !== null) {
          player.seekTo(seconds, true);
        }
      }
    },
onStateChange: handlePlayerStateChange
  }
});

}


// ================= Time helpers =================
function parseTime(str) {
  const parts = str.split(":").map(Number);
  if (parts.some(isNaN)) return null;

  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return null;
}

function jumpTime() {
  const t = document.getElementById("timeInput").value.trim();
  const seconds = parseTime(t);
  if (seconds !== null && player) {
    player.seekTo(seconds, true);
  }
}

// ================= Video change =================
function extractVideoId(input) {
  if (!input) return null;

  // Trim spaces
  input = input.trim();

  // If user already typed a clean 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input;
  }

  try {
    const url = new URL(input);

    // youtu.be/VIDEOID
    if (url.hostname.includes('youtu.be')) {
      return url.pathname.slice(1, 12);
    }

    // youtube.com/watch?v=VIDEOID
    if (url.searchParams.has('v')) {
      return url.searchParams.get('v').slice(0, 11);
    }

    // youtube.com/live/VIDEOID
    const liveMatch = url.pathname.match(/\/live\/([a-zA-Z0-9_-]{11})/);
    if (liveMatch) {
      return liveMatch[1];
    }

  } catch (e) {
    // Not a valid URL, fall through
  }

  return null;
}


function changeVideo() {
  const input = document.getElementById('urlInput').value.trim();
  if (!input || !player) return;

  const videoId = extractVideoId(input);

  player.loadVideoById(videoId);

if (!videoId) {
  alert('Invalid YouTube link or ID');
  return;
}
  // ✅ force mute again
  player.mute();

  // update URL without reload
  history.replaceState(null, '', `?v=${videoId}`);
}

// ================= Fullscreen + rotate =================
function requestLandscape() {
  if (screen.orientation?.lock) {
    screen.orientation.lock("landscape").catch(() => {});
  }
}

function unlockOrientation() {
  if (screen.orientation?.unlock) {
    screen.orientation.unlock();
  }
}

document.addEventListener("fullscreenchange", () => {
  document.fullscreenElement ? requestLandscape() : unlockOrientation();
})

// ==== make redbar appear in single click ===

const SEEK_STEP = 5;


// ==== something new ====
function seekBy(seconds) {
  if (!player) return;

  const current = player.getCurrentTime();
  const target = Math.max(0, current + seconds);
  player.seekTo(target, true);

  showFakeOverlay(seconds);

  // optional: nudge YouTube UI
  if (player.getPlayerState() === YT.PlayerState.PLAYING) {
    player.pauseVideo();
    setTimeout(() => player.playVideo(), 70);
  }
}



// === fullscreen ===
function togglePageFullscreen() {
  const container = document.getElementById("player-container");

  if (!document.fullscreenElement) {
    container.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

;

// === add copy current time ===


function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  return [
    h.toString().padStart(2, '0'),
    m.toString().padStart(2, '0'),
    s.toString().padStart(2, '0')
  ].join(':');
}

// ==== become checkmark green ===
function copyCurrentTime() {
  if (!player) return;

  const seconds = Math.floor(player.getCurrentTime());
  const timeStr = formatTime(seconds);

  navigator.clipboard.writeText(timeStr).then(() => {
    const btn = document.getElementById("copyBtn");
    const originalText = btn.textContent;

    btn.textContent = "✔ Copied!";
    btn.classList.add("copy-success");

    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove("copy-success");
    }, 1200);
  }).catch(() => {
    alert("Copy failed");
  });
}

//===overlay fakebar 1 ===//

let overlayTimer = null;

function showFakeOverlay(amountSeconds) {
  const overlay = document.getElementById("fakeOverlay");
  const seekText = document.getElementById("seekAmount");
  const timeText = document.getElementById("timeText");

  const current = Math.floor(player.getCurrentTime());
  const total = Math.floor(player.getDuration());

  seekText.textContent =
    (amountSeconds > 0 ? "+" : "") + amountSeconds;

  timeText.textContent =
    `${formatTime(current)} / ${formatTime(total)}`;

  overlay.classList.add("show");

  clearTimeout(overlayTimer);
  overlayTimer = setTimeout(() => {
    overlay.classList.remove("show");
  }, 1000);
}


//===== hide left right =====

let buttonHideTimer = null;
function showSideButtons() {
  const buttons = document.querySelectorAll(".side-controls button");

  buttons.forEach(btn => {
    btn.style.opacity = "0.75";
    btn.style.pointerEvents = "auto";
  });

  clearTimeout(buttonHideTimer);
  buttonHideTimer = setTimeout(hideSideButtons, 1500);
}

function hideSideButtons() {
  const buttons = document.querySelectorAll(".side-controls button");

  buttons.forEach(btn => {
    btn.style.opacity = "0";
    btn.style.pointerEvents = "none";
  });
}

const playerContainer = document.getElementById("player-container");

// PC: mouse movement
playerContainer.addEventListener("mousemove", () => {
  showSideButtons();
});

// Android / touch screens
playerContainer.addEventListener("touchstart", () => {
  showSideButtons();
}, { passive: true });

// ================= Double-click only seek =================

const btnLeft = document.getElementById("btnLeft");
const btnRight = document.getElementById("btnRight");

// block single click completely
btnLeft.addEventListener("click", e => {
  e.stopPropagation();
  e.preventDefault();

  showSideButtons();
  showFakeOverlay(-SEEK_STEP); // 👈 visual only
});

btnRight.addEventListener("click", e => {
  e.stopPropagation();
  e.preventDefault();

  showSideButtons();
  showFakeOverlay(SEEK_STEP); // 👈 visual only
});

// double click = real action


function applyDoublePressEffect(btn) {
  btn.classList.add("double-press");

  setTimeout(() => {
    btn.classList.remove("double-press");
  }, 120); // short = feels like native press
}


btnLeft.addEventListener("dblclick", e => {
  e.stopPropagation();
  e.preventDefault();

  applyDoublePressEffect(btnLeft);

  showSideButtons();
  seekBy(-7);
});

btnRight.addEventListener("dblclick", e => {
  e.stopPropagation();
  e.preventDefault();

  applyDoublePressEffect(btnRight);

  showSideButtons();
  seekBy(7);
});


function handlePlayerStateChange(e) {
  const rightControls = document.querySelector('.side-controls.right');
  if (!rightControls) return;

  if (e.data === YT.PlayerState.PAUSED) {
    rightControls.classList.add("pause-shift");
  } else {
    rightControls.classList.remove("pause-shift");
  }

}
