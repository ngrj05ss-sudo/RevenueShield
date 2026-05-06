// Dashboard client-side JavaScript
document.addEventListener('DOMContentLoaded', function () {
  initCharts();
  initSocket();
});

function initCharts() {
  // Engagement Trends Chart
  const timelineEl = document.getElementById('timeline-data');
  const engCtx = document.getElementById('engagementChart');
  if (timelineEl && engCtx) {
    const timeline = JSON.parse(timelineEl.textContent);
    new Chart(engCtx, {
      type: 'line',
      data: {
        labels: timeline.map(t => t._id),
        datasets: [
          { label: 'Views', data: timeline.map(t => t.views), borderColor: '#818cf8', backgroundColor: 'rgba(129,140,248,0.08)', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 3 },
          { label: 'Likes', data: timeline.map(t => t.likes), borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.08)', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 3 },
          { label: 'Shares', data: timeline.map(t => t.shares), borderColor: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.08)', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 3 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 }, usePointStyle: true, pointStyle: 'circle' } },
          tooltip: { backgroundColor: '#1e293b', titleColor: '#f1f5f9', bodyColor: '#cbd5e1', borderColor: '#334155', borderWidth: 1, cornerRadius: 12, padding: 12 },
        },
        scales: {
          x: { ticks: { color: '#64748b', maxTicksLimit: 7, font: { size: 11 } }, grid: { color: 'rgba(51,65,85,0.25)' } },
          y: { ticks: { color: '#64748b', font: { size: 11 } }, grid: { color: 'rgba(51,65,85,0.25)' } },
        },
      },
    });
  }

  // Weights Donut Chart
  const weightsEl = document.getElementById('weights-data');
  const wCtx = document.getElementById('weightsChart');
  if (weightsEl && wCtx) {
    const weights = JSON.parse(weightsEl.textContent);
    new Chart(wCtx, {
      type: 'doughnut',
      data: {
        labels: ['Views', 'Likes', 'Shares', 'Watch Time'],
        datasets: [{
          data: [weights.views, weights.likes, weights.shares, weights.watchTime],
          backgroundColor: ['rgba(129,140,248,0.8)', 'rgba(52,211,153,0.8)', 'rgba(251,191,36,0.8)', 'rgba(244,114,182,0.8)'],
          borderColor: '#0f172a',
          borderWidth: 3,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 }, padding: 16, usePointStyle: true } },
          tooltip: { backgroundColor: '#1e293b', titleColor: '#f1f5f9', bodyColor: '#cbd5e1', borderColor: '#334155', borderWidth: 1, cornerRadius: 12, padding: 12 },
        },
      },
    });
  }
}

function initSocket() {
  try {
    const socket = io();
    socket.on('connect', () => { console.log('🔌 Real-time connected'); });
    socket.on('distributionComplete', () => { showToast('Distribution completed! Refreshing...', 'success'); setTimeout(() => location.reload(), 1500); });
    socket.on('anomaliesDetected', (data) => { showToast(`${data.length} anomalies detected!`, 'warning'); setTimeout(() => location.reload(), 1500); });
    socket.on('engagementRecorded', () => { /* silent */ });
    socket.on('revenueUpdated', () => { showToast('Revenue pool updated!', 'info'); });
  } catch (e) { console.log('Socket.io not available'); }
}

function showToast(message, type) {
  const colors = { success: 'bg-emerald-500/90', warning: 'bg-amber-500/90', info: 'bg-blue-500/90', error: 'bg-red-500/90' };
  const toast = document.createElement('div');
  toast.className = `fixed top-20 right-4 z-50 px-5 py-3 rounded-xl text-white text-sm font-medium shadow-2xl ${colors[type] || colors.info} backdrop-blur-lg animate-slide-up`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.5s'; setTimeout(() => toast.remove(), 500); }, 3000);
}

async function runDistribution() {
  const btn = document.getElementById('btn-distribute');
  btn.disabled = true;
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="flex items-center gap-2"><svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Processing...</span>';
  try {
    const res = await fetch('/api/distribute?admin=true');
    const data = await res.json();
    if (data.success) { showToast('Revenue distributed successfully!', 'success'); setTimeout(() => location.reload(), 1500); }
    else { showToast(data.message || 'Distribution failed', 'error'); btn.disabled = false; btn.innerHTML = originalText; }
  } catch (e) { showToast('Network error', 'error'); btn.disabled = false; btn.innerHTML = originalText; }
}

async function runDetection() {
  const btn = document.getElementById('btn-detect');
  btn.disabled = true;
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="flex items-center gap-2"><svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Scanning...</span>';
  try {
    const res = await fetch('/api/anomalies/detect?admin=true', { method: 'POST' });
    const data = await res.json();
    if (data.success) { showToast(`Detection complete: ${data.detected} anomalies found`, data.detected > 0 ? 'warning' : 'success'); setTimeout(() => location.reload(), 1500); }
    else { showToast(data.message || 'Detection failed', 'error'); }
  } catch (e) { showToast('Network error', 'error'); }
  btn.disabled = false;
  btn.innerHTML = originalText;
}

function filterCreators(query) {
  const rows = document.querySelectorAll('.creator-row');
  const q = query.toLowerCase();
  rows.forEach(row => { row.style.display = row.dataset.name.includes(q) ? '' : 'none'; });
}
