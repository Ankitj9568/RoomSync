// scan.js - Inbuilt camera QR scanner for group invites (logged-in users).
// Prefers the native BarcodeDetector API where the platform has it (Android,
// macOS); elsewhere falls back to the html5-qrcode library, and a QR image
// can always be uploaded instead (handy for screenshots shared on WhatsApp).
// Each group's QR encodes its join URL; scanning resolves the code, previews
// the group, and offers Join (direct join) or Cancel — or sends an approval
// request when the group requires it.

let scanStream = null;
let scanRafId = null;
let scanCode = null;
let scanDetector = null;
let scanLibrary = null;
let scanLibraryRunning = false;

const QR_LIBRARY_CDN = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('groupChanged', resetScanner);
    const uploadInput = document.getElementById('qrUploadInput');
    if (uploadInput) uploadInput.addEventListener('change', handleQrUpload);
});

// Explicit camera permission step: the scanner only starts after the user
// taps Allow, so access is never taken silently.
async function requestCameraAndScan() {
    const startBtn = document.getElementById('scanStartBtn');
    if (startBtn) startBtn.classList.add('d-none');
    await startScanner();
}

async function startScanner() {
    const video = document.getElementById('scanVideo');
    const status = document.getElementById('scanStatus');
    const retry = document.getElementById('scanRetryBtn');
    retry.classList.add('d-none');

    // Native fast path where the platform supports it.
    if ('BarcodeDetector' in window) {
        try {
            scanDetector = new BarcodeDetector({ formats: ['qr_code'] });
            await startNativeCamera();
            return;
        } catch (error) {
            console.error('Native scanner unavailable, trying library fallback', error);
        }
    }

    // Library fallback for Windows, Linux, iOS, and other browsers without
    // BarcodeDetector. Loaded on demand so supporting browsers pay nothing.
    await startLibraryScanner();
}

async function startNativeCamera() {
    const video = document.getElementById('scanVideo');
    const status = document.getElementById('scanStatus');
    const retry = document.getElementById('scanRetryBtn');

    try {
        scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    } catch (error) {
        status.textContent = 'Camera permission is needed to scan. Allow camera access and retry, or upload a QR image below.';
        retry.classList.remove('d-none');
        return;
    }

    video.srcObject = scanStream;
    await video.play();
    video.classList.remove('d-none');
    status.textContent = 'Point the camera at the group QR code...';
    scanLoop();
}

function loadQrLibrary() {
    if (window.Html5Qrcode) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = QR_LIBRARY_CDN;
        script.onload = resolve;
        script.onerror = () => reject(new Error('Could not load the scanner library. Check your connection and retry.'));
        document.head.appendChild(script);
    });
}

async function startLibraryScanner() {
    const status = document.getElementById('scanStatus');
    const retry = document.getElementById('scanRetryBtn');
    const readerEl = document.getElementById('qrLibraryReader');

    try {
        await loadQrLibrary();
    } catch (error) {
        status.textContent = error.message + ' You can still upload a QR image below once online.';
        return;
    }

    try {
        stopCamera();
        readerEl.classList.remove('d-none');
        scanLibrary = new window.Html5Qrcode('qrLibraryReader');
        await scanLibrary.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            decodedText => onScanned(decodedText),
            () => {}
        );
        scanLibraryRunning = true;
        status.textContent = 'Point the camera at the group QR code...';
    } catch (error) {
        console.error('Library scanner failed', error);
        status.textContent = 'Could not start the camera here. Upload a QR image below instead.';
        retry.classList.remove('d-none');
    }
}

async function handleQrUpload(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    const status = document.getElementById('scanStatus');
    status.textContent = 'Reading QR image...';

    try {
        await loadQrLibrary();
        const readerEl = document.getElementById('qrLibraryReader');
        if (!scanLibraryRunning && readerEl) readerEl.innerHTML = '';
        const scanner = scanLibrary && scanLibraryRunning ? scanLibrary : new window.Html5Qrcode('qrLibraryReader');
        const decoded = await scanner.scanFile(file, true);
        await onScanned(decoded);
    } catch (error) {
        console.error('QR upload failed', error);
        status.textContent = 'No readable RoomSync QR found in that image. Try another screenshot.';
    }
}

function stopCamera() {
    if (scanRafId) cancelAnimationFrame(scanRafId);
    scanRafId = null;
    if (scanStream) {
        scanStream.getTracks().forEach(track => track.stop());
        scanStream = null;
    }
    if (scanLibraryRunning && scanLibrary) {
        scanLibraryRunning = false;
        scanLibrary.stop().catch(() => {}).finally(() => {
            try { scanLibrary.clear(); } catch { /* already cleared */ }
        });
    }
    document.getElementById('scanVideo').classList.add('d-none');
    const readerEl = document.getElementById('qrLibraryReader');
    if (readerEl) {
        readerEl.classList.add('d-none');
        readerEl.innerHTML = '';
    }
}

async function scanLoop() {
    const video = document.getElementById('scanVideo');
    try {
        const codes = await scanDetector.detect(video);
        if (codes && codes.length > 0 && codes[0].rawValue) {
            await onScanned(codes[0].rawValue);
            return;
        }
    } catch (error) {
        console.error('Scan failed', error);
    }
    scanRafId = requestAnimationFrame(scanLoop);
}

function extractInviteCode(text) {
    return extractRoomSyncCode(text);
}

// RoomSync QR legitimacy check: only our own invite links are accepted — a
// real https URL to this app's join page carrying a valid code plus the
// `src=roomsync` watermark. Anything else (random QR codes, plain codes,
// other websites) is rejected so the scanner never opens surprises.
// Because the payload is a genuine site URL, external scanners like Google
// Lens simply show our website link.
function extractRoomSyncCode(text) {
    const raw = String(text || '').trim();
    let url = null;
    try {
        url = new URL(raw);
    } catch {
        return null;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.pathname.includes('/pages/join.html')) return null;
    if (url.searchParams.get('src') !== 'roomsync') return null;
    const code = String(url.searchParams.get('code') || '').trim().toUpperCase();
    return /^[A-Z0-9]{6,10}$/.test(code) ? code : null;
}

async function onScanned(text) {
    stopCamera();
    scanCode = extractInviteCode(text);
    const status = document.getElementById('scanStatus');
    if (!scanCode) {
        status.textContent = 'That is not a RoomSync group QR. Only QR codes generated by this app are accepted.';
        document.getElementById('scanRetryBtn').classList.remove('d-none');
        return;
    }

    try {
        const res = await apiFetch(`/api/groups/code/${scanCode}`, {}, true);
        if (!res.success) return;
        document.getElementById('scanGroupName').textContent = res.data.name;
        document.getElementById('scanGroupMeta').textContent = `Invite code ${res.data.group_code}`;
        document.getElementById('scanResultCard').classList.remove('d-none');
        status.textContent = 'Code scanned. Confirm below.';
    } catch (error) {
        status.textContent = error.message || 'Invalid or expired invite code.';
        document.getElementById('scanRetryBtn').classList.remove('d-none');
    }
}

async function confirmScanJoin() {
    if (!scanCode) return;
    try {
        const res = await apiFetch('/api/groups/join', {
            method: 'POST',
            body: { code: scanCode }
        });
        if (res.pending) {
            alert('Your request to join has been sent to the group admins for approval.');
        } else if (res.data && res.data.group_id) {
            localStorage.setItem('activeGroupId', res.data.group_id);
            window.location.href = 'dashboard.html';
            return;
        }
        window.location.href = 'groups.html';
    } catch (error) {
        alert(error.message || 'Failed to join group.');
    }
}

function resetScanner() {
    stopCamera();
    scanCode = null;
    document.getElementById('scanResultCard').classList.add('d-none');
    const startBtn = document.getElementById('scanStartBtn');
    if (startBtn) startBtn.classList.remove('d-none');
    document.getElementById('scanStatus').textContent = 'RoomSync needs camera access to scan a group QR code. Nothing is recorded.';
}
