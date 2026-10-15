const $ = (s) => document.querySelector(s);

const VPN_WORDS = [
  'mullvad', 'nordvpn', 'expressvpn', 'surfshark', 'protonvpn', 'proton vpn',
  'private internet access', 'cyberghost', 'tunnelbear', 'windscribe', 'ivpn',
  'airvpn', 'ovpn', 'riseup', 'perfect privacy', 'vyprvpn', 'hotspot shield',
  'ipvanish', 'purevpn', 'zenmate', 'hidemyass', 'privatevpn', 'strongvpn',
  'betternet', 'turbo vpn', 'atlas vpn', 'azirevpn', 'cryptostorm', 'freedome',
  'f-secure', 'hide.me', 'hideme', 'hola vpn', 'kaspersky vpn', 'norton vpn',
  'opera vpn', 'private tunnel', 'speedify', 'trust.zone', 'urban vpn',
  'vpn unlimited', 'vpnac', 'vpngate', 'vpnsecure', 'x-vpn', 'zoogvpn',
  'brave vpn', 'warp',
];

const HOSTING_WORDS = [
  'm247', 'tzulo', 'datacamp', 'data camp', 'hostroyale', 'blix',
  '31173', 'stamis', 'privatelayer', 'choopa', 'frantech', 'cogent',
  'leaseweb', 'vultr', 'digitalocean', 'hetzner', 'ovh', 'linode',
  'contabo', 'akamai', 'amazon', 'aws', 'google cloud', 'microsoft',
  'azure', 'cloudflare', 'hosting', 'datacenter', 'data center',
  'colocation', 'vps', 'server', 'cloud',
];

const VPN_ASNS = new Set([
  9009, 11878, 60068, 212238,
  39351, 39702, 44468, 197141, 216025, 43357,
  20473, 13335,
]);

let running = false;

async function fetchTimeout(url, ms = 7000, opts = {}) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { ...opts, signal: c.signal });
    clearTimeout(t);
    return r;
  } catch (e) { clearTimeout(t); throw e; }
}

async function getJson(url, ms = 7000, opts) {
  const r = await fetchTimeout(url, ms, opts);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

async function getText(url, ms = 7000) {
  const r = await fetchTimeout(url, ms);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return (await r.text()).trim();
}

const isV4 = (s) => /^\d{1,3}(\.\d{1,3}){3}$/.test((s || '').trim());
const isV6 = (s) => !!s && s.includes(':') && /^[0-9a-fA-F:.%]+$/.test(s.trim());

const isV4Strict = (s) => {
  const p = String(s || '').split('.');
  return p.length === 4 && p.every((o) => /^\d{1,3}$/.test(o) && +o <= 255);
};
const isV6Strict = (s) => {
  s = String(s || '');
  return s.includes(':') && ((s.match(/:/g) || []).length >= 2) && /^[0-9a-f:.%]+$/i.test(s);
};
const isPrivateV4 = (s) => {
  const p = s.split('.').map(Number);
  return s === '0.0.0.0' || p[0] === 10 || p[0] === 127 ||
    (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
    (p[0] === 192 && p[1] === 168) || (p[0] === 169 && p[1] === 254);
};
const isRoutableV6 = (s) => {
  const l = s.toLowerCase();
  return !(l === '::' || l.startsWith('fe80:') || l.startsWith('fec0:') ||
    l.startsWith('fc') || l.startsWith('fd'));
};
const same24 = (a, b) => {
  const x = String(a || '').split('.'), y = String(b || '').split('.');
  return x.length === 4 && y.length === 4 && x[0] === y[0] && x[1] === y[1] && x[2] === y[2];
};
const cap = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

const PRETTY = {
  'mullvad': 'Mullvad', 'nordvpn': 'NordVPN', 'expressvpn': 'ExpressVPN',
  'surfshark': 'Surfshark', 'protonvpn': 'ProtonVPN', 'proton vpn': 'ProtonVPN',
  'private internet access': 'Private Internet Access', 'cyberghost': 'CyberGhost',
  'tunnelbear': 'TunnelBear', 'windscribe': 'Windscribe', 'ivpn': 'IVPN',
  'airvpn': 'AirVPN', 'ovpn': 'OVPN.com', 'riseup': 'RiseupVPN',
  'perfect privacy': 'Perfect Privacy', 'vyprvpn': 'VyprVPN',
  'hotspot shield': 'Hotspot Shield', 'ipvanish': 'IPVanish', 'purevpn': 'PureVPN',
  'zenmate': 'ZenMate', 'hidemyass': 'HideMyAss', 'privatevpn': 'PrivateVPN',
  'strongvpn': 'StrongVPN', 'betternet': 'Betternet', 'turbo vpn': 'Turbo VPN',
  'atlas vpn': 'Atlas VPN', 'azirevpn': 'AzireVPN', 'cryptostorm': 'Cryptostorm',
  'freedome': 'Freedome', 'f-secure': 'F-Secure', 'hide.me': 'Hide.me',
  'hideme': 'Hide.me', 'hola vpn': 'Hola VPN', 'kaspersky vpn': 'Kaspersky VPN',
  'norton vpn': 'Norton VPN', 'opera vpn': 'Opera VPN',
  'private tunnel': 'Private Tunnel', 'speedify': 'Speedify',
  'trust.zone': 'Trust.Zone', 'urban vpn': 'Urban VPN',
  'vpn unlimited': 'VPN Unlimited', 'vpnac': 'VPNArea', 'vpngate': 'VPNGate',
  'vpnsecure': 'VPNSecure', 'x-vpn': 'X-VPN', 'zoogvpn': 'ZoogVPN',
  'brave vpn': 'Brave VPN', 'warp': 'Cloudflare Warp',
};
const pretty = (k) => PRETTY[k.toLowerCase()] || cap(k);

function setRow(name, value) {
  const el = document.querySelector(`[data-row="${name}"] [data-val]`);
  if (el) { el.classList.remove('loading'); el.textContent = value; }
}

function setLoading() {
  document.querySelectorAll('[data-val]').forEach((el) => {
    el.textContent = 'loading';
    el.classList.add('loading');
  });
}

// probey bois

async function probeMullvad() {
  for (let i = 0; i < 2; i++) {
    try {
      const j = await getJson('https://am.i.mullvad.net/json', 7000);
      if (j && j.ip) return j;
    } catch (e) { if (i === 1) return null; }
  }
  return null;
}

async function probeIPv4(fallback) {
  if (fallback && isV4(fallback)) return fallback;
  const tries = [
    async () => (await getJson('https://api.ipify.org?format=json')).ip,
    async () => await getText('https://ipv4.icanhazip.com'),
    async () => (await getJson('https://ipwho.is/')).ip,
  ];
  for (const fn of tries) {
    try { const ip = (await fn()).trim(); if (isV4(ip)) return ip; } catch (e) {}
  }
  return null;
}

async function probeGeo() {
  try {
    const j = await getJson('https://ipwho.is/', 8000);
    if (j && j.success !== false && j.ip) {
      return {
        country: j.country, countryCode: j.country_code, city: j.city, region: j.region,
        isp: j.connection?.isp, org: j.connection?.org,
        asn: j.connection?.asn ? 'AS' + j.connection.asn : null,
        asnNum: j.connection?.asn || null,
        timezone: j.timezone?.id || j.timezone,
      };
    }
  } catch (e) {}
  try {
    const j = await getJson('https://ipapi.co/json/', 8000);
    if (j && j.ip) {
      const m = (j.asn || '').match(/AS(\d+)/);
      return {
        country: j.country_name, countryCode: j.country_code, city: j.city, region: j.region,
        isp: j.org, org: j.org, asn: j.asn, asnNum: m ? +m[1] : null, timezone: j.timezone,
      };
    }
  } catch (e) {}
  return {};
}

async function probeDNS() {
  try {
    const j = await getJson('https://edns.ip-api.com/json', 8000);
    const ips = [];
    const d = j.dns?.ip || j.dns, e = j.edns?.ip || j.edns;
    if (d && typeof d === 'string') ips.push(d.trim());
    if (e && typeof e === 'string' && e !== d) ips.push(e.trim());
    return [...new Set(ips)].filter(Boolean);
  } catch (e) { return null; }
}

function parseCandidate(c) {
  const i = String(c || '').indexOf('candidate:');
  if (i < 0) return null; // never guess at token positions — that caused the "e:1234" false leak
  const t = c.slice(i + 10).trim().split(/\s+/);
  const ti = t.indexOf('typ');
  if (t.length < 8 || ti < 0) return null;
  return { ip: t[4], type: t[ti + 1] };
}

function probeWebRTC(ms = 7000) {
  return new Promise((resolve) => {
    const v4 = new Set(), v6 = new Set();
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      try { pc.close(); } catch (e) {}
      resolve({ v4: [...v4], v6: [...v6] });
    };
    let pc;
    try {
      pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    } catch (e) { return resolve({ v4: [], v6: [] }); }
    pc.onicecandidate = (e) => {
      if (!e.candidate) return finish();
      const p = parseCandidate(e.candidate.candidate || '');
      if (!p || p.type !== 'srflx') return;
      if (isV4Strict(p.ip) && !isPrivateV4(p.ip)) v4.add(p.ip);
      else if (isV6Strict(p.ip) && isRoutableV6(p.ip)) v6.add(p.ip);
    };
    try {
      pc.createDataChannel('x');
      pc.createOffer().then((o) => pc.setLocalDescription(o)).catch(finish);
    } catch (e) { return finish(); }
    setTimeout(finish, ms);
  });
}

async function probeIPv6() {
  try {
    const j = await getJson('https://api64.ipify.org?format=json', 7000);
    if (isV6(j.ip)) return j.ip.trim();
  } catch (e) {}
  return null;
}

function bundleLookup(ip) {
  try {
    if (!ip || !window.VPN_EXIT_IPS || !window.VPN_EXIT_NAMES) return null;
    const i = window.VPN_EXIT_IPS[ip.trim()];
    return i === undefined ? null : window.VPN_EXIT_NAMES[i];
  } catch (e) { return null; }
}

async function probeProxycheck(ip) {
  try {
    const j = await getJson(`https://proxycheck.io/v3/${encodeURIComponent(ip)}?vpn=1`, 8000);
    const r = j && j[ip];
    if (!r) return null;
    return {
      vpn: !!r.detections?.vpn,
      hosting: !!r.detections?.hosting,
      operator: r.operator?.name || null,
    };
  } catch (e) { return null; } 
}

function v4ToArpa(ip) {
  const p = ip.trim().split('.');
  if (p.length !== 4 || !p.every((o) => /^\d{1,3}$/.test(o))) return null;
  return p.reverse().join('.') + '.in-addr.arpa';
}
function v6ToArpa(ip) {
  try {
    const [head = '', tail = ''] = ip.split('::');
    const h = head ? head.split(':') : [], t = tail ? tail.split(':') : [];
    const missing = 8 - h.length - t.length;
    if (missing < 0) return null;
    const full = [...h, ...Array(missing).fill('0'), ...t]
      .map((g) => g.padStart(4, '0')).join('').toLowerCase().replace(/[^0-9a-f]/g, '');
    if (full.length !== 32) return null;
    return full.split('').reverse().join('.') + '.ip6.arpa';
  } catch (e) { return null; }
}
async function ptrLookup(ip) {
  const name = ip.includes(':') ? v6ToArpa(ip) : v4ToArpa(ip);
  if (!name) return null;
  const opts = { headers: { accept: 'application/dns-json' } };
  const queries = [
    getJson(`https://cloudflare-dns.com/dns-query?name=${name}&type=PTR`, 5000, opts),
    getJson(`https://dns.google/resolve?name=${name}&type=PTR`, 5000),
  ];
  const res = await Promise.allSettled(queries);
  for (const r of res) {
    const ans = r.status === 'fulfilled' ? r.value?.Answer || [] : [];
    for (const a of ans) {
      const h = (a.data || '').replace(/\.$/, '');
      if (h && !/arpa$/i.test(h)) return h;
    }
  }
  return null;
}

function combineVPN({ ip, ipv6, geo, mullvad, pc, ptrHost }) {
  for (const cand of [ip, ipv6]) {
    const name = cand && bundleLookup(cand);
    if (name) return { found: true, confident: true, label: name, via: 'exit list' };
  }
  if (mullvad?.mullvad_exit_ip) {
    return {
      found: true, confident: true,
      label: 'Mullvad' + (mullvad.mullvad_exit_ip_hostname ? ` (${mullvad.mullvad_exit_ip_hostname})` : ''),
      via: 'Mullvad check',
    };
  }
  if (pc?.operator) return { found: true, confident: true, label: pc.operator, via: 'network lookup' };
  if (pc?.vpn) return { found: true, confident: true, label: 'VPN exit', via: 'network lookup' };
  if (ptrHost) {
    const h = ptrHost.toLowerCase();
    const v = VPN_WORDS.find((k) => h.includes(k));
    if (v) return { found: true, confident: true, label: `${pretty(v)} (${ptrHost})`, via: 'reverse DNS' };
  }
  const hay = `${geo.isp || ''} ${geo.org || ''} ${geo.asn || ''} ${ptrHost || ''}`.toLowerCase();
  const vpnHit = VPN_WORDS.find((k) => hay.includes(k));
  if (vpnHit) return { found: true, confident: true, label: pretty(vpnHit), via: 'network name' };
  const hostHit = HOSTING_WORDS.find((k) => hay.includes(k));
  if (hostHit || pc?.hosting) {
    return { found: true, confident: false, label: `${geo.isp || geo.org || ptrHost || 'Hosting exit'} (datacenter)`, via: 'hosting trace' };
  }
  if (geo.asnNum && VPN_ASNS.has(geo.asnNum)) {
    return { found: true, confident: false, label: `${geo.isp || geo.org || geo.asn} (datacenter ASN)`, via: 'hosting trace' };
  }
  return { found: false, confident: false, label: 'None detected', via: null };
}

function scoreResults({ vpn, dns, exitIp, v4leak, ipv6, v6ok, tzMismatch }) {
  let score = 100;
  const notes = [];

  if (vpn.found) {
    notes.push(`✓ VPN exit detected — ${vpn.label} [${vpn.via}]`);
  } else {
    score -= 35;
    notes.push('−35 No VPN signs — residential ISP, no hosting flags');
  }

  if (dns === null) {
    notes.push('· DNS hidden or blocked — no penalty');
  } else if (vpn.confident) {
    notes.push(`· DNS resolver${dns.length > 1 ? 's' : ''}: ${dns.join(', ')} (via VPN — ok)`);
  } else if (dns.length && !vpn.found) {
    score -= 10;
    notes.push(`−10 DNS resolver differs from exit IP (${dns.join(', ')})`);
  } else {
    const sameNet = dns.length && exitIp && dns.some((d) => same24(d, exitIp));
    notes.push(`· DNS: ${dns.join(', ') || 'hidden'}${sameNet ? ' (same network as exit — ok)' : ''}`);
  }

  if (v4leak.length) {
    score -= 25;
    notes.push(`−25 WebRTC leak — second public IPv4 exposed (${v4leak[0]})`);
  } else {
    notes.push('✓ No WebRTC public leak');
  }

  if (ipv6) {
    if (v6ok) notes.push(`✓ IPv6 also exits via VPN (${v6ok})`);
    else if (vpn.found) { score -= 5; notes.push(`−5 IPv6 reachable (${ipv6.slice(0, 18)}…) — couldn't confirm VPN routing`); }
    else { score -= 10; notes.push(`−10 IPv6 exposed (${ipv6.slice(0, 18)}…)`); }
  } else {
    notes.push('✓ No IPv6 leak');
  }

  // Browser-vs-exit timezone mismatch is EXPECTED on any VPN — never penalize it there.
  if (tzMismatch) {
    if (vpn.found) notes.push('· Timezone differs from exit — expected with VPN, no penalty');
    else { score -= 5; notes.push('−5 Timezone differs from IP location'); }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const verdict = score >= 85 ? 'PROTECTED' : score >= 60 ? 'VULNERABLE' : 'UNPROTECTED';
  return { score, verdict, notes };
}

async function run() {
  if (running) return;
  running = true;
  const btn = $('#run');
  btn.disabled = true; btn.textContent = 'Testing…';
  $('#verdict').hidden = true;
  $('#why').hidden = true;
  $('#hint').textContent = 'Checking IP, DNS and leaks…';
  setLoading();

  const mullvad = await probeMullvad();
  const ip = await probeIPv4(mullvad?.ip);
  setRow('ip', ip || 'unavailable');

  const [geo, dns, wrtc, ipv6, pc, ptrHost] = await Promise.all([
    probeGeo(), probeDNS(), probeWebRTC(), probeIPv6(),
    ip ? probeProxycheck(ip) : Promise.resolve(null),
    ip ? ptrLookup(ip) : Promise.resolve(null),
  ]);

  const vpn = combineVPN({ ip, ipv6, geo, mullvad, pc, ptrHost });
  const exitIp = ip || mullvad?.ip || geo.ip;

  let v6ok = ipv6 ? bundleLookup(ipv6) : null;
  if (ipv6 && !v6ok) {
    const v6pc = await probeProxycheck(ipv6);
    if (v6pc && (v6pc.operator || v6pc.vpn)) v6ok = v6pc.operator || 'flagged VPN exit';
  }

  setRow('location', geo.city && geo.country ? `${geo.city}, ${geo.country}` : (mullvad?.city ? `${mullvad.city}, ${mullvad.country}` : 'unknown'));
  setRow('isp', geo.isp || geo.org || mullvad?.organization || 'unknown');
  setRow('vpn', vpn.label);
  setRow('dns', dns === null ? 'hidden / blocked' : dns.length ? dns.join(', ') : 'hidden / blocked');

  const v4leak = wrtc.v4.filter((s) => s !== exitIp);
  setRow('webrtc',
    v4leak.length ? `leak: ${v4leak.join(', ')}`
    : wrtc.v4.length ? `via VPN (${wrtc.v4[0]})`
    : wrtc.v6.length ? `no extra IPv4 (v6: ${wrtc.v6[0].slice(0, 20)}…)`
    : 'no leak');
  setRow('ipv6', ipv6 || 'none — good');

  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzMismatch = !!(geo.timezone && browserTz && geo.timezone !== browserTz);

  const { score, verdict, notes } = scoreResults({ vpn, dns: dns || [], exitIp, v4leak, ipv6, v6ok, tzMismatch });

  const box = $('#verdict');
  box.hidden = false;
  box.className = verdict.toLowerCase();

  const t0 = performance.now();
  (function tick(t) {
    const p = Math.min(1, (t - t0) / 900);
    const shown = Math.round(score * (1 - Math.pow(1 - p, 3)));
    $('#verdictScore').innerHTML = `${shown}<small> / 100</small>`;
    if (p < 1) requestAnimationFrame(tick);
  })(t0);

  $('#verdictLabel').textContent = verdict;
  $('#verdictReason').textContent =
    verdict === 'PROTECTED'
      ? (vpn.confident ? `Your traffic exits through ${vpn.label}. No DNS, WebRTC or IPv6 spill found.` : 'VPN exit detected. No material leaks found.')
      : verdict === 'VULNERABLE'
        ? 'A tunnel looks present but something spills — see notes below.'
        : 'No VPN detected. Your real provider and location are visible.';

  $('#why').hidden = false;
  $('#whyList').innerHTML = notes.map((n) => `<li>${n.replace(/</g, '&lt;')}</li>`).join('');
  $('#hint').textContent = `Exit IP ${exitIp || 'unknown'} · ${geo.timezone || browserTz || ''} · click Run to re-test.`;

  btn.disabled = false; btn.textContent = 'Run test again';
  running = false;
}

$('#run').onclick = run;
$('#runTop').onclick = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); run(); };
