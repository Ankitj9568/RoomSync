// scan.js - Inbuilt camera QR scanner for group invites (logged-in users).
// Uses the native BarcodeDetector API (no extra dependency). Each group's QR
// encodes its join URL (/pages/join.html?code=XXXX); scanning resolves the
// code, previews the group, and offers Join (direct join) or Cancel — or
// sends an approval request when the group requires it.

let scanStream = null;
let scanRafId = null;
let scanCode = null;
let scanDetector = null;

document.addEventListener('DOMContentLoaded', () => {
    startScanner();
    window.addEventListener('groupChanged', resetScanner);
});

async function startScanner() {
    const video = document.getElementById('scanVideo');
    const status = document.getElementById('scanStatus');
    const retry = document.getElementById('scanRetryBtn');
    retry.classList.add('d-none');

    if (!('BarcodeDetector' in window)) {
        status.textContent = 'This browser cannot scan QR codes. Please type the invite code on the Groups page instead.';
        return;
    }

    try {
        scanDetector = new BarcodeDetector({ formats: ['qr_code'] });
    } catch (error) {
        status.textContent = 'QR scanning is unavailable here. Please type the invite code on the Groups page instead.';
        return;
    }

    try {
        scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    } catch (error) {
        status.textContent = 'Camera permission is needed to scan. Allow camera access and retry.';
        retry.classList.remove('d-none');
        return;
    }

    video.srcObject = scanStream;
    await video.play();
    video.classList.remove('d-none');
    status.textContent = 'Point the camera at the group QR code...';
    scanLoop();
}

function stopCamera() {
    if (scanRafId) cancelAnimationFrame(scanRafId);
    scanRafId = null;
    if (scanStream) {
        scanStream.getTracks().forEach(track => track.stop());
        scanStream = null;
    }
    document.getElementById('scanVideo').classList.add('d-none');
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
    const match = String(text).match(/[?&]code=([A-Za-z0-9]{6,10})/i);
    if (match) return match[1].toUpperCase();
    const bare = String(text).trim().toUpperCase();
    return /^[A-Z0-9]{6,10}$/.test(bare) ? bare : null;
}

async function onScanned(text) {
    stopCamera();
    scanCode = extractInviteCode(text);
    const status = document.getElementById('scanStatus');
    if (!scanCode) {
        status.textContent = 'That QR code is not a RoomSync invite. Try again.';
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
    startScanner();
}
