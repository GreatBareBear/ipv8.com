// ===== ipv8.com — IP Tools =====

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initHeroIP();
  initLookup();
  initSubnet();
  initConvert();
  initCIDR();
  initPorts();
  initPing();
});

// ===== Nav =====
function initNav() {
  const toggle = document.getElementById('menuToggle');
  const links = document.getElementById('navLinks');
  toggle.addEventListener('click', () => links.classList.toggle('open'));
  links.querySelectorAll('.nav-link').forEach(a => {
    a.addEventListener('click', () => links.classList.remove('open'));
  });
}

// ===== Hero: Auto-detect IP =====
async function initHeroIP() {
  const ipEl = document.getElementById('ipValue');
  const locEl = document.getElementById('detailLocation');
  const ispEl = document.getElementById('detailISP');
  const countryEl = document.getElementById('detailCountry');
  const copyBtn = document.getElementById('copyIp');

  try {
    const res = await fetch('https://ipapi.co/json/');
    const d = await res.json();
    ipEl.textContent = d.ip || 'Unknown';
    locEl.textContent = [d.city, d.region].filter(Boolean).join(', ') || '—';
    ispEl.textContent = d.org || '—';
    countryEl.textContent = d.country_name || '—';

    // Store for lookup reuse
    window._myIP = d.ip;
  } catch {
    // Fallback
    try {
      const res2 = await fetch('https://api.ipify.org?format=json');
      const d2 = await res2.json();
      ipEl.textContent = d2.ip || 'Unknown';
    } catch {
      ipEl.textContent = 'Unable to detect';
    }
  }

  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(ipEl.textContent).then(() => {
      copyBtn.classList.add('copied');
      setTimeout(() => copyBtn.classList.remove('copied'), 1500);
    });
  });
}

// ===== Helper: show result =====
function showResult(id, html) {
  const el = document.getElementById(id);
  el.innerHTML = html;
  el.classList.add('visible');
}

function showRows(id, rows) {
  const html = rows.map(r =>
    `<div class="row"><span class="label">${esc(r[0])}</span><span class="value${r[2] ? ' accent-val' : ''}">${esc(r[1])}</span></div>`
  ).join('');
  showResult(id, html);
}

function showError(id, msg) {
  showResult(id, `<div class="error">${esc(msg)}</div>`);
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function isValidIPv4(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every(p => {
    const n = Number(p);
    return /^\d+$/.test(p) && n >= 0 && n <= 255;
  });
}

function ipToLong(ip) {
  return ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
}

function longToIp(n) {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

function toBin(n, bits = 8) {
  return n.toString(2).padStart(bits, '0');
}

// ===== IP Lookup =====
function initLookup() {
  const btn = document.getElementById('lookupBtn');
  const input = document.getElementById('lookupInput');

  const run = async () => {
    const ip = input.value.trim();
    if (!ip) { showError('lookupResult', 'Please enter an IP address'); return; }
    if (!isValidIPv4(ip)) { showError('lookupResult', 'Invalid IPv4 address'); return; }

    showResult('lookupResult', '<div class="spinner"></div> Querying...');
    btn.disabled = true;

    try {
      const res = await fetch(`https://ipapi.co/${ip}/json/`);
      const d = await res.json();
      if (d.error) { showError('lookupResult', d.reason || 'Lookup failed'); return; }
      showRows('lookupResult', [
        ['IP', d.ip, true],
        ['Country', `${d.country_name || ''} (${d.country || ''})`],
        ['Region', d.region || '—'],
        ['City', d.city || '—'],
        ['Postal', d.postal || '—'],
        ['Latitude', d.latitude || '—'],
        ['Longitude', d.longitude || '—'],
        ['Timezone', d.timezone || '—'],
        ['ISP / Org', d.org || '—'],
        ['ASN', d.asn || '—'],
      ]);
    } catch (e) {
      showError('lookupResult', 'Request failed. Try again.');
    } finally {
      btn.disabled = false;
    }
  };

  btn.addEventListener('click', run);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
}

// ===== Subnet Calculator =====
function initSubnet() {
  const btn = document.getElementById('subnetBtn');
  const input = document.getElementById('subnetInput');

  const run = () => {
    const val = input.value.trim();
    let ip, prefix;

    if (val.includes('/')) {
      [ip, prefix] = val.split('/');
    } else {
      ip = val;
      prefix = 24;
    }

    prefix = parseInt(prefix, 10);
    if (!isValidIPv4(ip) || isNaN(prefix) || prefix < 0 || prefix > 32) {
      showError('subnetResult', 'Format: 192.168.1.0/24');
      return;
    }

    const mask = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0;
    const ipLong = ipToLong(ip);
    const network = (ipLong & mask) >>> 0;
    const broadcast = (network | (~mask >>> 0)) >>> 0;
    const hostBits = 32 - prefix;
    const totalHosts = Math.pow(2, hostBits);
    const usableHosts = totalHosts > 2 ? totalHosts - 2 : totalHosts;
    const firstHost = totalHosts > 2 ? network + 1 : network;
    const lastHost = totalHosts > 2 ? broadcast - 1 : broadcast;

    showRows('subnetResult', [
      ['CIDR Notation', `${longToIp(network)}/${prefix}`, true],
      ['Subnet Mask', longToIp(mask)],
      ['Wildcard Mask', longToIp(~mask >>> 0)],
      ['Network Address', longToIp(network)],
      ['Broadcast Address', longToIp(broadcast)],
      ['First Host', longToIp(firstHost)],
      ['Last Host', longToIp(lastHost)],
      ['Total Hosts', totalHosts.toLocaleString()],
      ['Usable Hosts', usableHosts.toLocaleString()],
      ['IP Class', getIPClass(ip)],
      ['Binary Mask', toBin(mask >>> 24) + '.' + toBin((mask >>> 16) & 255) + '.' + toBin((mask >>> 8) & 255) + '.' + toBin(mask & 255)],
    ]);
  };

  btn.addEventListener('click', run);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
}

function getIPClass(ip) {
  const first = parseInt(ip.split('.')[0], 10);
  if (first < 128) return 'A';
  if (first < 192) return 'B';
  if (first < 224) return 'C';
  if (first < 240) return 'D (Multicast)';
  return 'E (Reserved)';
}

// ===== IP Converter =====
function initConvert() {
  const btn = document.getElementById('convertBtn');
  const input = document.getElementById('convertInput');

  const run = () => {
    const ip = input.value.trim();
    if (!isValidIPv4(ip)) {
      showError('convertResult', 'Invalid IPv4 address');
      return;
    }

    const parts = ip.split('.').map(Number);
    const long = ipToLong(ip);

    const rows = [
      ['Dotted Decimal', ip, true],
      ['Decimal (32-bit)', long.toString()],
      ['Hexadecimal', '0x' + long.toString(16).toUpperCase().padStart(8, '0')],
      ['Octal', '0' + long.toString(8)],
      ['Binary', parts.map(p => toBin(p)).join('.')],
      ['Hex Bytes', parts.map(p => '0x' + p.toString(16).toUpperCase().padStart(2, '0')).join(' ')],
      ['Reverse DNS', [...parts].reverse().join('.') + '.in-addr.arpa'],
    ];

    // Check if it's a private/reserved range
    const type = getIPType(ip);
    if (type) rows.push(['Type', type]);

    showRows('convertResult', rows);
  };

  btn.addEventListener('click', run);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
}

function getIPType(ip) {
  const parts = ip.split('.').map(Number);
  if (parts[0] === 10) return 'Private (RFC 1918)';
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return 'Private (RFC 1918)';
  if (parts[0] === 192 && parts[1] === 168) return 'Private (RFC 1918)';
  if (parts[0] === 127) return 'Loopback';
  if (parts[0] === 169 && parts[1] === 254) return 'Link-local';
  if (parts[0] === 0) return 'Reserved (This network)';
  if (parts[0] >= 224 && parts[0] <= 239) return 'Multicast';
  if (parts[0] >= 240) return 'Reserved (Future use)';
  return '';
}

// ===== CIDR Range =====
function initCIDR() {
  const btn = document.getElementById('cidrBtn');
  const input = document.getElementById('cidrInput');

  const run = () => {
    const val = input.value.trim();
    if (!val.includes('/')) { showError('cidrResult', 'Format: 10.0.0.0/30'); return; }

    const [ip, prefixStr] = val.split('/');
    const prefix = parseInt(prefixStr, 10);

    if (!isValidIPv4(ip) || isNaN(prefix) || prefix < 24 || prefix > 32) {
      showError('cidrResult', 'Supported range: /24 to /32 (for listing IPs)');
      return;
    }

    const mask = (0xFFFFFFFF << (32 - prefix)) >>> 0;
    const network = (ipToLong(ip) & mask) >>> 0;
    const total = Math.pow(2, 32 - prefix);

    if (total > 256) {
      showError('cidrResult', `${total} IPs — too many to list. Use /25 or smaller.`);
      return;
    }

    let ips = [];
    for (let i = 0; i < Math.min(total, 256); i++) {
      ips.push(longToIp(network + i));
    }

    let html = `<div class="row"><span class="label">Range</span><span class="value accent-val">${longToIp(network)}/${prefix}</span></div>`;
    html += `<div class="row"><span class="label">Count</span><span class="value">${total} IPs</span></div>`;
    html += `<div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(30,41,59,0.5)">`;
    if (total <= 32) {
      html += ips.map(ip => `<div style="font-family:var(--mono);font-size:0.8rem;padding:3px 0;color:var(--text-dim)">${ip}</div>`).join('');
    } else {
      html += `<div style="font-family:var(--mono);font-size:0.8rem;color:var(--text-dim)">`;
      html += `${ips[0]} — ${ips[ips.length - 1]}</div>`;
      html += `<div style="color:var(--text-muted);font-size:0.75rem;margin-top:8px">First & last shown (${total} total)</div>`;
    }
    html += '</div>';

    showResult('cidrResult', html);
  };

  btn.addEventListener('click', run);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
}

// ===== Port Lookup =====
function initPorts() {
  const btn = document.getElementById('portBtn');
  const input = document.getElementById('portInput');

  const PORTS = [
    [20, 'FTP Data', 'TCP'],
    [21, 'FTP Control', 'TCP'],
    [22, 'SSH', 'TCP'],
    [23, 'Telnet', 'TCP'],
    [25, 'SMTP', 'TCP'],
    [53, 'DNS', 'TCP/UDP'],
    [67, 'DHCP Server', 'UDP'],
    [68, 'DHCP Client', 'UDP'],
    [69, 'TFTP', 'UDP'],
    [80, 'HTTP', 'TCP'],
    [110, 'POP3', 'TCP'],
    [119, 'NNTP', 'TCP'],
    [123, 'NTP', 'UDP'],
    [143, 'IMAP', 'TCP'],
    [161, 'SNMP', 'UDP'],
    [194, 'IRC', 'TCP'],
    [389, 'LDAP', 'TCP'],
    [443, 'HTTPS', 'TCP'],
    [445, 'SMB', 'TCP'],
    [465, 'SMTPS', 'TCP'],
    [514, 'Syslog', 'UDP'],
    [515, 'LPD/LPR', 'TCP'],
    [587, 'SMTP (Submission)', 'TCP'],
    [631, 'IPP (Printing)', 'TCP'],
    [636, 'LDAPS', 'TCP'],
    [993, 'IMAPS', 'TCP'],
    [995, 'POP3S', 'TCP'],
    [1080, 'SOCKS Proxy', 'TCP'],
    [1433, 'MS SQL', 'TCP'],
    [1434, 'MS SQL Monitor', 'UDP'],
    [1521, 'Oracle DB', 'TCP'],
    [1723, 'PPTP', 'TCP'],
    [2049, 'NFS', 'TCP/UDP'],
    [2082, 'cPanel', 'TCP'],
    [2083, 'cPanel SSL', 'TCP'],
    [2181, 'ZooKeeper', 'TCP'],
    [3000, 'Grafana / Dev Server', 'TCP'],
    [3306, 'MySQL', 'TCP'],
    [3389, 'RDP', 'TCP'],
    [4443, 'HTTPS Alt', 'TCP'],
    [5000, 'UPnP / Flask', 'TCP'],
    [5432, 'PostgreSQL', 'TCP'],
    [5433, 'PostgreSQL Alt', 'TCP'],
    [5672, 'AMQP (RabbitMQ)', 'TCP'],
    [5900, 'VNC', 'TCP'],
    [5984, 'CouchDB', 'TCP'],
    [6379, 'Redis', 'TCP'],
    [6443, 'Kubernetes API', 'TCP'],
    [7001, 'WebLogic', 'TCP'],
    [8000, 'HTTP Alt', 'TCP'],
    [8080, 'HTTP Proxy / Alt', 'TCP'],
    [8443, 'HTTPS Alt', 'TCP'],
    [8888, 'Jupyter / HTTP Alt', 'TCP'],
    [9000, 'SonarQube / PHP-FPM', 'TCP'],
    [9090, 'Prometheus', 'TCP'],
    [9092, 'Kafka', 'TCP'],
    [9200, 'Elasticsearch', 'TCP'],
    [9300, 'Elasticsearch Transport', 'TCP'],
    [11211, 'Memcached', 'TCP/UDP'],
    [15672, 'RabbitMQ Management', 'TCP'],
    [27017, 'MongoDB', 'TCP'],
    [27018, 'MongoDB Shard', 'TCP'],
    [27019, 'MongoDB Config', 'TCP'],
  ];

  const run = () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { showError('portResult', 'Enter a port number or service name'); return; }

    let results;
    if (/^\d+$/.test(q)) {
      results = PORTS.filter(p => p[0] === parseInt(q, 10));
    } else {
      results = PORTS.filter(p => p[1].toLowerCase().includes(q));
    }

    if (results.length === 0) {
      showError('portResult', 'No matches found');
      return;
    }

    const rows = results.map(p => [String(p[0]), `${p[1]} (${p[2]})`, true]);
    showRows('portResult', rows);
  };

  btn.addEventListener('click', run);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
}

// ===== HTTP Latency Test =====
function initPing() {
  const btn = document.getElementById('pingBtn');
  const input = document.getElementById('pingInput');

  const run = async () => {
    let url = input.value.trim();
    if (!url) { showError('pingResult', 'Enter a domain or URL'); return; }

    if (!url.startsWith('http')) url = 'https://' + url;

    showResult('pingResult', '<div class="spinner"></div> Testing...');
    btn.disabled = true;

    const rounds = 3;
    const results = [];

    for (let i = 0; i < rounds; i++) {
      try {
        const start = performance.now();
        // Use no-cors mode to avoid CORS issues; we just measure connection time
        await fetch(url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now(), {
          mode: 'no-cors',
          cache: 'no-store',
        });
        const ms = Math.round(performance.now() - start);
        results.push(ms);
      } catch {
        results.push(-1);
      }
      if (i < rounds - 1) await new Promise(r => setTimeout(r, 300));
    }

    const valid = results.filter(r => r >= 0);
    if (valid.length === 0) {
      showError('pingResult', 'All requests failed. Check the URL.');
      btn.disabled = false;
      return;
    }

    const avg = Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
    const min = Math.min(...valid);
    const max = Math.max(...valid);

    let html = '';
    results.forEach((ms, i) => {
      html += `<div class="row"><span class="label">Round ${i + 1}</span><span class="value${ms < 0 ? '' : ''}">${ms < 0 ? 'Failed' : ms + ' ms'}</span></div>`;
    });
    html += `<div class="row"><span class="label">Min</span><span class="value accent-val">${min} ms</span></div>`;
    html += `<div class="row"><span class="label">Avg</span><span class="value accent-val">${avg} ms</span></div>`;
    html += `<div class="row"><span class="label">Max</span><span class="value accent-val">${max} ms</span></div>`;
    html += `<div style="margin-top:8px;color:var(--text-muted);font-size:0.75rem">⚠ HTTP latency (includes server response), not ICMP ping</div>`;

    showResult('pingResult', html);
    btn.disabled = false;
  };

  btn.addEventListener('click', run);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
}
