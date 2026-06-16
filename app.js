/**
 * Art & Craft Carnival – Poster Maker
 * Canvas size: 1080 x 1350 px (exact template dimensions)
 *
 * Zone coordinates (inset from the full white areas to match reference image):
 *   Art  zone : x=28,  y=737, w=385, h=370  (landscape, lower-left)
 *   Artist zone: x=445, y=403, w=600, h=748  (portrait, right side)
 *   Instagram icon: top-right of artist zone ~(862, 393)
 */

'use strict';

/* ── Canvas & Template dimensions ── */
const CANVAS_W = 1080;
const CANVAS_H = 1350;

/* ── Zone definitions (exact template image coordinates) ── */
const ZONES = {
  art:    { x: 45,  y: 730, w: 383, h: 379 },
  artist: { x: 513, y: 709, w: 383, h: 379 },
  insta:  { x: 900, y: 710, w: 50,  h: 380 }
};

/* ── State ── */
const state = {
  templateOverlay: null,  // template_overlay.png (transparent holes)
  artImg: null,
  artistImg: null,
  instaHandle: ''
};

/* ── DOM refs ── */
const canvas      = document.getElementById('posterCanvas');
const ctx         = canvas.getContext('2d');
const canvasWrap  = document.getElementById('canvasWrap');

const artInput    = document.getElementById('artUpload');
const artistInput = document.getElementById('artistUpload');
const downloadBtn = document.getElementById('downloadBtn');

const hotzoneArt    = document.getElementById('hotzoneArt');
const hotzoneArtist = document.getElementById('hotzoneArtist');
const hotzoneInsta  = document.getElementById('hotzoneInsta');

/* ─────────────────────────────────────────────────
   Initialise canvas
───────────────────────────────────────────────── */
canvas.width  = CANVAS_W;
canvas.height = CANVAS_H;

/* ─────────────────────────────────────────────────
   Load template overlay image (holes punched out)
───────────────────────────────────────────────── */
function loadTemplates() {
  const overlay = new Image();
  overlay.onload  = () => {
    state.templateOverlay = overlay;
    render();
    positionHotzones();
  };
  overlay.onerror = () => {
    console.error('Could not load template_overlay.png');
    // Fall back to original template
    const orig = new Image();
    orig.onload = () => { state.templateOverlay = orig; render(); positionHotzones(); };
    orig.src = 'template.png';
  };
  overlay.src = 'template_overlay.png';
}

/* ─────────────────────────────────────────────────
   Position hot-zones to match canvas visual scale
───────────────────────────────────────────────── */
function positionHotzones() {
  const canvasEl = canvas;
  const dispW = canvasEl.offsetWidth;
  const dispH = canvasEl.offsetHeight;
  const scaleX = dispW / CANVAS_W;
  const scaleY = dispH / CANVAS_H;

  function setZone(el, zone) {
    el.style.left   = Math.round(zone.x * scaleX) + 'px';
    el.style.top    = Math.round(zone.y * scaleY) + 'px';
    el.style.width  = Math.round(zone.w * scaleX) + 'px';
    el.style.height = Math.round(zone.h * scaleY) + 'px';
  }

  setZone(hotzoneArt,    ZONES.art);
  setZone(hotzoneArtist, ZONES.artist);
  setZone(hotzoneInsta,  ZONES.insta);
}

/* ─────────────────────────────────────────────────
   Draw Helpers
───────────────────────────────────────────────── */

/** Draw an image fitted (cover/crop) into a rectangle */
function drawImageCover(img, x, y, w, h) {
  const imgRatio  = img.width / img.height;
  const boxRatio  = w / h;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (imgRatio > boxRatio) {
    // Image is wider than box – crop sides
    sw = img.height * boxRatio;
    sx = (img.width - sw) / 2;
  } else {
    // Image is taller than box – crop top/bottom
    sh = img.width / boxRatio;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/** Draw rounded-rectangle clip path */
function roundedClip(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ─────────────────────────────────────────────────
   Draw placeholder zone (red box with upload hint)
───────────────────────────────────────────────── */
function drawPlaceholder(zone, label) {
  const { x, y, w, h } = zone;

  // Red background
  ctx.fillStyle = '#c31d1d';
  ctx.fillRect(x, y, w, h);

  // Dashed inner border
  ctx.save();
  ctx.setLineDash([14, 8]);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 8, y + 8, w - 16, h - 16);
  ctx.restore();

  // Upload icon circle
  const cx = x + w / 2;
  const cy = y + h / 2 - 30;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(40, h * 0.08), 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.min(36, h * 0.07)}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⬆', cx, cy);

  // Label
  ctx.font = `bold ${Math.min(26, h * 0.05)}px Inter, sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(label, cx, y + h / 2 + 10);
}

/* ─────────────────────────────────────────────────
   Draw Instagram logo and handle text horizontally
   Placed above the artist photo (as in the reference image)
───────────────────────────────────────────────── */
function drawInstagramSection() {
  const handle = state.instaHandle;

  ctx.save();

  // Draw Instagram handle text rotated 90 degrees clockwise.
  // Center of Instagram icon is x = 927.
  // We'll align the text center line to x = 927, and start writing down from y = 765.
  const textX = 927;
  const textY = 765;

  ctx.translate(textX, textY);
  ctx.rotate(Math.PI / 2); // 90 degrees clockwise rotation

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  if (handle) {
    ctx.fillStyle = '#000000'; // Match the black instagram icon outline
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillText('@' + handle, 0, 0);
  } else {
    // Semi-transparent placeholder when empty
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillText('@yourusername', 0, 0);
  }

  ctx.restore();
}

/* ─────────────────────────────────────────────────
   MAIN RENDER
───────────────────────────────────────────────── */
function render() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  /* 1. White background base */
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  /* 2a. Art zone: user image OR placeholder */
  if (state.artImg) {
    ctx.save();
    roundedClip(ZONES.art.x, ZONES.art.y, ZONES.art.w, ZONES.art.h, 0);
    ctx.clip();
    drawImageCover(state.artImg, ZONES.art.x, ZONES.art.y, ZONES.art.w, ZONES.art.h);
    ctx.restore();
  } else {
    drawPlaceholder(ZONES.art, 'Upload Artwork');
  }

  /* 2b. Artist zone: user photo OR placeholder */
  if (state.artistImg) {
    ctx.save();
    roundedClip(ZONES.artist.x, ZONES.artist.y, ZONES.artist.w, ZONES.artist.h, 0);
    ctx.clip();
    drawImageCover(state.artistImg, ZONES.artist.x, ZONES.artist.y, ZONES.artist.w, ZONES.artist.h);
    ctx.restore();
  } else {
    drawPlaceholder(ZONES.artist, 'Upload Your Photo');
  }

  /* 3. Draw the template overlay on top (has transparent holes where boxes are) */
  if (state.templateOverlay) {
    ctx.drawImage(state.templateOverlay, 0, 0, CANVAS_W, CANVAS_H);
  }

  /* Draw Instagram logo & handle text */
  drawInstagramSection();
}

/* ─────────────────────────────────────────────────
   Re-position hotzones on canvas resize
───────────────────────────────────────────────── */
const resizeObserver = new ResizeObserver(() => positionHotzones());
resizeObserver.observe(canvas);
window.addEventListener('resize', positionHotzones);

/* ─────────────────────────────────────────────────
   File Upload handlers
───────────────────────────────────────────────── */
function loadImageFile(file, callback) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => callback(img, e.target.result);
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/* ── Cropper Modal Handlers ── */
let cropper = null;
let currentCropTarget = null; // 'art' or 'artist'

const cropModal = document.getElementById('cropModal');
const cropImage = document.getElementById('cropImage');
const cropCancelBtn = document.getElementById('cropCancelBtn');
const cropSaveBtn = document.getElementById('cropSaveBtn');

function openCropModal(src, target) {
  currentCropTarget = target;
  cropImage.src = src;
  cropModal.style.display = 'flex';

  // Destroy previous cropper if it exists
  if (cropper) {
    cropper.destroy();
  }

  // Initialize Cropper.js
  cropper = new Cropper(cropImage, {
    aspectRatio: 383 / 379, // locked to the 383x379px container aspect ratio
    viewMode: 1, // Keep crop box within image boundary
    dragMode: 'move',
    autoCropArea: 1,
    restore: false,
    guides: true,
    center: true,
    highlight: false,
    cropBoxMovable: true,
    cropBoxResizable: true,
    toggleDragModeOnDblclick: false,
  });
}

function closeCropModal() {
  cropModal.style.display = 'none';
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
  // Reset input values so the user can re-upload the same file if desired
  artInput.value = '';
  artistInput.value = '';
}

cropCancelBtn.addEventListener('click', closeCropModal);

cropSaveBtn.addEventListener('click', () => {
  if (!cropper) return;

  // Get cropped canvas exactly matched to square sizes: 383x379 px
  const croppedCanvas = cropper.getCroppedCanvas({
    width: 383,
    height: 379
  });

  if (croppedCanvas) {
    const img = new Image();
    img.onload = () => {
      if (currentCropTarget === 'art') {
        state.artImg = img;
      } else {
        state.artistImg = img;
      }
      render();
      closeCropModal();
    };
    img.src = croppedCanvas.toDataURL('image/png');
  }
});

/* Art */
artInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    openCropModal(ev.target.result, 'art');
  };
  reader.readAsDataURL(file);
});

/* Artist photo */
artistInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    openCropModal(ev.target.result, 'artist');
  };
  reader.readAsDataURL(file);
});

/* ── Instagram Handle Modal Handlers ── */
const instaModal      = document.getElementById('instaModal');
const modalInstaInput = document.getElementById('modalInstaInput');
const instaCancelBtn  = document.getElementById('instaCancelBtn');
const instaSaveBtn    = document.getElementById('instaSaveBtn');

function openInstaModal() {
  modalInstaInput.value = state.instaHandle;
  instaModal.style.display = 'flex';
  setTimeout(() => modalInstaInput.focus(), 50);
}

function closeInstaModal() {
  instaModal.style.display = 'none';
}

function applyInstaHandle() {
  state.instaHandle = modalInstaInput.value.replace(/^@/, '').trim();
  render();
  closeInstaModal();
}

instaCancelBtn.addEventListener('click', closeInstaModal);
instaSaveBtn.addEventListener('click', applyInstaHandle);
modalInstaInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    applyInstaHandle();
  }
});

/* ─────────────────────────────────────────────────
   Hot-zone click handlers
───────────────────────────────────────────────── */
hotzoneArt.addEventListener('click',    () => artInput.click());
hotzoneArtist.addEventListener('click', () => artistInput.click());
hotzoneInsta.addEventListener('click',  openInstaModal);

/* ─────────────────────────────────────────────────
   Download
───────────────────────────────────────────────── */
downloadBtn.addEventListener('click', () => {
  render(); // ensure latest state

  const link = document.createElement('a');
  link.download = 'ArtCarnival_MyPoster.png';
  link.href = canvas.toDataURL('image/png', 1.0);
  link.click();
});

/* ─────────────────────────────────────────────────
   Boot
───────────────────────────────────────────────── */
loadTemplates();
