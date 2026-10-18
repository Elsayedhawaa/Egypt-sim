/* ============================================================
   VIEW: REAL ESTATE — Market (compounds, local, lands, mine)
   ============================================================
   This file owns the real estate tab AND the sub-tab registry.
   File 16-view-home-manage.js adds Renovate/Furnish/Staff tabs
   by calling registerRealEstateTab(...). No wrapping.

   Owns: S.ownedHomes, S.land, S.realestateContracts, S.realEstateTab
   ============================================================ */

/* ---------- Sub-tab registry ---------- */
const RealEstateTabs = [];
function registerRealEstateTab(tab) {
  const existing = RealEstateTabs.findIndex(t => t.id === tab.id);
  if (existing >= 0) RealEstateTabs[existing] = tab;
  else RealEstateTabs.push(tab);
  RealEstateTabs.sort((a, b) => a.order - b.order);
}
window.registerRealEstateTab = registerRealEstateTab;

/* ---------- State init / migration ---------- */
function ensureRealEstateState() {
  if (!S) return;
  if (!Array.isArray(S.ownedHomes)) S.ownedHomes = [];
  if (!Array.isArray(S.land)) S.land = [];
  if (!Array.isArray(S.realestateContracts)) S.realestateContracts = [];
  if (!S.realEstateTab) S.realEstateTab = 'compounds';
  if (S.housing === undefined) S.housing = 'parents';

  S.ownedHomes.forEach(h => {
    if (typeof h.id !== 'string') h.id = 'h_' + Math.random().toString(36).slice(2, 8);
    if (typeof h.condition !== 'number') h.condition = 100;
    if (typeof h.status !== 'string') h.status = 'vacant';
    if (typeof h.value !== 'number') h.value = 0;
    if (typeof h.monthlyRent !== 'number') h.monthlyRent = Math.round(h.value * 0.0035);
    if (typeof h.hap !== 'number') h.hap = 0;
    if (typeof h.hp !== 'number') h.hp = 0;
    if (typeof h.area !== 'number') h.area = 130;
    if (typeof h.finishing !== 'string') h.finishing = 'core_shell';
    if (!Array.isArray(h.upgrades)) h.upgrades = [];
    if (!h.furniture || typeof h.furniture !== 'object') h.furniture = {};
    if (!Array.isArray(h.staff)) h.staff = [];
    if (typeof h.homeComfort !== 'number') h.homeComfort = 0;
    if (typeof h.style !== 'string') h.style = null;
    if (typeof h.unitId !== 'string') h.unitId = null;
    if (typeof h.source !== 'string') h.source = 'compound';
    if (typeof h.compoundId !== 'string') h.compoundId = null;
    if (typeof h.purchasedYear !== 'number') h.purchasedYear = gameYear();
  });

  if (!S.ownedHomes.find(h => h.id === S.realEstateActiveHomeId)) {
    S.realEstateActiveHomeId = S.ownedHomes[0]?.id || null;
  }
}
GameHooks.on('newGame', ensureRealEstateState);

/* ---------- Create a home (fully initialized) ---------- */
function createHome(base) {
  return Object.assign({
    id: 'h_' + Math.random().toString(36).slice(2, 8),
    name: 'Home',
    country: S?.country || 'egy',
    city: 'Unknown',
    location: 'Unknown',
    value: 0,
    condition: 100,
    status: 'vacant',
    monthlyRent: 0,
    hap: 0, hp: 0,
    area: 130,
    finishing: 'core_shell',
    upgrades: [],
    furniture: {},
    staff: [],
    homeComfort: 0,
    style: null,
    unitId: null,
    source: 'compound',
    compoundId: null,
    purchasedYear: gameYear(),
  }, base);
}
window.createHome = createHome;

/* ---------- Main tab ---------- */
function realEstateView() {
  ensureRealEstateState();
  const availableTabs = RealEstateTabs.filter(t => !t.requiresHome || S.ownedHomes.length > 0);
  const currentTab = availableTabs.find(t => t.id === S.realEstateTab) || availableTabs[0];
  if (currentTab && S.realEstateTab !== currentTab.id) S.realEstateTab = currentTab.id;

  let html = `<div class="card">
    <h3>Real Estate · ${C().name}</h3>
    <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px">
      ${availableTabs.map(t => `<button class="pill ${S.realEstateTab === t.id ? 'on' : ''}" style="padding:6px 10px;font-size:.75rem" onclick="S.realEstateTab='${t.id}';render()">${t.label}</button>`).join('')}
    </div>
  </div>`;

  if (currentTab) html += currentTab.render();
  return html;
}

/* ---------- Market sections ---------- */
function compoundsSection() {
  const list = COMPOUNDS[S.country];
  if (!list || !list.length) {
    return `<div class="card"><h3>No compounds in ${C().name} yet</h3>
      <p class="muted small">Try Local or Lands. Compounds for more countries are added over time.</p></div>`;
  }
  return list.map(c => {
    const cheapest = PROPERTY_UNITS.reduce((min, u) => Math.min(min, Math.round(u.area * c.ppm * u.priceMult)), Infinity);
    return `<div class="card">
      <h3>${c.name}</h3>
      <p class="muted small">${c.loc} · ${c.developer} · ${c.delivery === 'ready' ? 'Ready' : 'Delivery ' + c.delivery}</p>
      <p class="small" style="margin:6px 0">${c.tag}</p>
      <div class="row"><span>Price / m²</span><b class="mono">${c.ppmLow.toLocaleString()}–${c.ppmHigh.toLocaleString()} ${C().currency}</b></div>
      <div class="row"><span>Entry price (smallest unit)</span><b class="mono">${cheapest.toLocaleString()} ${C().currency}</b></div>
      <div class="row"><span>Amenities</span><b class="small">${c.amenities.join(' · ')}</b></div>
      <button class="opt" style="margin-top:8px" onclick="S.pendingBuy={kind:'compound',sourceId:'${c.id}'};render()">Browse units & plans</button>
    </div>`;
  }).join('');
}

function localSection() {
  const list = LOCAL_MARKET[S.country];
  if (!list || !list.length) {
    return `<div class="card"><h3>No local properties in ${C().name} yet</h3>
      <p class="muted small">Try Compounds or Lands.</p></div>`;
  }
  return list.map(c => {
    const cheapest = PROPERTY_UNITS.reduce((min, u) => Math.min(min, Math.round(u.area * c.ppm * u.priceMult)), Infinity);
    return `<div class="card">
      <h3>${c.name}</h3>
      <p class="muted small">${c.loc}, ${c.city} · Cash only</p>
      <p class="small" style="margin:6px 0">${c.tag}</p>
      <div class="row"><span>Price / m²</span><b class="mono">${c.ppm.toLocaleString()} ${C().currency}</b></div>
      <div class="row"><span>Entry price</span><b class="mono">${cheapest.toLocaleString()} ${C().currency}</b></div>
      <button class="opt" style="margin-top:8px" onclick="S.pendingBuy={kind:'local',sourceId:'${c.id}'};render()">Browse units (cash only)</button>
    </div>`;
  }).join('');
}

function landsSection() {
  const list = LANDS.filter(l => l.country === S.country);
  if (!list.length) {
    return `<div class="card"><h3>No land for sale in ${C().name} yet</h3></div>`;
  }
  let html = list.map(l => {
    const minPrice = l.minSize * l.ppm;
    return `<div class="card">
      <h3>${l.name}</h3>
      <p class="muted small">${l.city} · ${l.zoning}</p>
      <div class="row"><span>Price / m²</span><b class="mono">${l.ppm.toLocaleString()} ${C().currency}</b></div>
      <div class="row"><span>Size range</span><b>${l.minSize}–${l.maxSize} m²</b></div>
      <div class="row"><span>Minimum cost</span><b class="mono">${minPrice.toLocaleString()} ${C().currency}</b></div>
      <button class="opt" style="margin-top:8px" onclick="promptBuyLand('${l.id}')">Buy land</button>
    </div>`;
  }).join('');

  if (S.land.length) {
    html += `<div class="card"><h3>Your land</h3>
      ${S.land.map(l => `<div class="row">
        <span>${l.name} · ${l.size} m²</span>
        ${l.built
          ? '<b class="good">Built</b>'
          : `<button class="opt" style="width:auto;padding:4px 8px;margin:0;font-size:.72rem" onclick="promptBuildOnLand('${l.id}')">Build house</button>`}
      </div>`).join('')}
    </div>`;
  }
  return html;
}

function mineSection() {
  if (!S.ownedHomes.length) {
    return `<div class="card"><h3>You own no properties</h3>
      <p class="muted small">Browse Compounds, Local, or Lands to start.</p></div>`;
  }
  return `<div class="card">
    <h3>Your properties</h3>
    ${S.ownedHomes.map(h => {
      const contract = S.realestateContracts.find(c => c.homeId === h.id);
      const statusLabel = h.status === 'occupied' ? '🏠 You live here'
        : h.status === 'rented' ? `✅ Rented · ${h.monthlyRent.toLocaleString()} ${C().currency}/mo`
        : 'Vacant';
      const finTier = RENOVATION_OPTIONS.finishingTiers.find(t => t.id === h.finishing);
      const furnCount = Object.keys(h.furniture).length;
      return `<div style="padding:10px 0;border-bottom:1px solid #1a1a2a">
        <b>${h.name}</b>
        <div class="muted small">${h.location} · condition ${h.condition}%</div>
        <div class="row"><span>Market value</span><b class="mono">${h.value.toLocaleString()} ${C().currency}</b></div>
        ${contract ? `<div class="row"><span>Installments</span><b class="mono bad">${contract.remaining.toLocaleString()} · ${contract.yearsLeft}yr</b></div>` : ''}
        <div class="row"><span>Status</span><b>${statusLabel}</b></div>
        <div class="row"><span>Finishing</span><b class="small">${finTier ? finTier.name : '—'}</b></div>
        <div class="row"><span>Furnished rooms</span><b>${furnCount} / 7</b></div>
        ${h.staff.length ? `<div class="row"><span>Staff</span><b>${h.staff.length} hired</b></div>` : ''}
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px">
          ${h.status !== 'occupied' ? `<button class="pill" style="padding:4px 8px;font-size:.72rem" onclick="moveIntoHome('${h.id}')">Move in</button>` : ''}
          ${h.status !== 'rented' ? `<button class="pill" style="padding:4px 8px;font-size:.72rem" onclick="setHomeForRent('${h.id}')">Rent out</button>` : `<button class="pill" style="padding:4px 8px;font-size:.72rem" onclick="stopRenting('${h.id}')">Stop renting</button>`}
          <button class="pill" style="padding:4px 8px;font-size:.72rem" onclick="S.realEstateActiveHomeId='${h.id}';S.realEstateTab='renovate';render()">🔧 Renovate</button>
          <button class="pill" style="padding:4px 8px;font-size:.72rem" onclick="S.realEstateActiveHomeId='${h.id}';S.realEstateTab='furnish';render()">🛋 Furnish</button>
          <button class="pill" style="padding:4px 8px;font-size:.72rem" onclick="S.realEstateActiveHomeId='${h.id}';S.realEstateTab='staff';render()">👥 Staff</button>
          <button class="pill" style="padding:4px 8px;font-size:.72rem" onclick="sellHome('${h.id}')">Sell</button>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

/* ---------- Unit picker (inline within tab) ---------- */
const _baseRealEstateView = realEstateView;
realEstateView = function() {
  ensureRealEstateState();
  let html = _baseRealEstateView();
  if (S.pendingBuy) html = unitPicker(S.pendingBuy) + html;
  return html;
};

function unitPicker(ctx) {
  const list = ctx.kind === 'compound' ? (COMPOUNDS[S.country] || []) : (LOCAL_MARKET[S.country] || []);
  const prop = list.find(c => c.id === ctx.sourceId);
  if (!prop) { S.pendingBuy = null; return ''; }

  const plans = ctx.kind === 'compound' ? PAYMENT_PLANS : [PAYMENT_PLANS.find(p => p.id === 'cash')];

  let html = `<div class="card" style="border-color:#8b5cf6">
    <h3>${prop.name}</h3>
    <p class="muted small">Choose a unit type and payment plan. Final price = area × price/m² × multiplier × plan markup.</p>
    <button class="pill" style="padding:4px 8px;font-size:.75rem;margin-top:6px" onclick="S.pendingBuy=null;render()">✕ Cancel</button>
  </div>`;

  PROPERTY_UNITS.forEach(u => {
    const basePrice = Math.round(u.area * prop.ppm * u.priceMult);
    html += `<div class="card" style="padding:10px">
      <b>${u.name}</b> <span class="muted small">· ${u.area} m²</span>
      <div class="row"><span>Base price</span><b class="mono">${basePrice.toLocaleString()} ${C().currency}</b></div>
      <div style="display:flex;flex-direction:column;gap:4px;margin-top:4px">
        ${plans.map(p => {
          const finalPrice = Math.round(basePrice * p.totalMarkup);
          const down = Math.round(finalPrice * p.downPct);
          const canAfford = S.wealth >= down;
          return `<button class="pill" style="padding:6px 8px;font-size:.72rem;text-align:left;${canAfford ? '' : 'opacity:.5'}" ${canAfford ? '' : 'disabled'} onclick="buyProperty('${ctx.kind}','${prop.id}','${u.id}','${p.id}')">
            ${p.label} · ${down.toLocaleString()} ${C().currency} down${p.years > 0 ? ` · ${(finalPrice / (p.years * 12)).toFixed(0)}/mo × ${p.years}y` : ''}
          </button>`;
        }).join('')}
      </div>
    </div>`;
  });
  return html;
}

/* ---------- Purchase ---------- */
function buyProperty(kind, sourceId, unitId, planId) {
  ensureRealEstateState();
  const list = kind === 'compound' ? (COMPOUNDS[S.country] || []) : (LOCAL_MARKET[S.country] || []);
  const prop = list.find(c => c.id === sourceId);
  const unit = PROPERTY_UNITS.find(u => u.id === unitId);
  const plan = PAYMENT_PLANS.find(p => p.id === planId) || PAYMENT_PLANS[0];
  if (!prop || !unit) { S.pendingBuy = null; render(); return; }

  const basePrice = Math.round(unit.area * prop.ppm * unit.priceMult);
  const finalPrice = Math.round(basePrice * plan.totalMarkup);
  const down = Math.round(finalPrice * plan.downPct);
  if (S.wealth < down) { log(`Cannot afford ${unit.name}. Need ${money(down)} down.`); S.pendingBuy = null; render(); return; }

  S.wealth -= down;
  const home = createHome({
    name: `${unit.name} · ${prop.name}`,
    city: prop.city || 'Unknown',
    location: prop.loc || prop.city,
    value: finalPrice,
    monthlyRent: Math.round(finalPrice * (prop.rentalYieldAnnPct || 0.07) / 12),
    hap: prop.hap || 0,
    hp: prop.hp || 0,
    area: unit.area,
    unitId: unit.id,
    source: kind,
    compoundId: kind === 'compound' ? prop.id : null,
  });
  S.ownedHomes.push(home);
  if (plan.years > 0) {
    S.realestateContracts.push({
      homeId: home.id,
      name: home.name,
      remaining: finalPrice - down,
      yearsTotal: plan.years,
      yearsLeft: plan.years,
      annualPayment: Math.round((finalPrice - down) / plan.years),
    });
  }
  log(`Bought ${home.name}. Down: ${money(down)}${plan.years > 0 ? ` · ${plan.years}-year installment` : ''}`);
  S.pendingBuy = null;
  S.realEstateTab = 'mine';
  render();
}
window.buyProperty = buyProperty;

/* ---------- Land ---------- */
function promptBuyLand(landId) {
  const land = LANDS.find(l => l.id === landId);
  if (!land) return;
  const sizeInput = prompt(`How many m²? (${land.minSize}–${land.maxSize})`, land.minSize);
  if (sizeInput == null) return;
  const size = parseInt(sizeInput, 10);
  if (!size || size < land.minSize || size > land.maxSize) {
    log(`Invalid size. Must be ${land.minSize}–${land.maxSize} m².`);
    render();
    return;
  }
  const price = size * land.ppm;
  if (S.wealth < price) { log(`Cannot afford ${size}m² land. Need ${money(price)}.`); render(); return; }
  S.wealth -= price;
  S.land.push({ id: 'land_' + Math.random().toString(36).slice(2, 8), name: land.name, city: land.city, size, price, built: false });
  log(`Bought ${size} m² of land in ${land.city} for ${money(price)}.`);
  render();
}
window.promptBuyLand = promptBuyLand;

/* ---------- Manage homes ---------- */
function moveIntoHome(homeId) {
  const h = S.ownedHomes.find(x => x.id === homeId);
  if (!h) return;
  S.ownedHomes.forEach(x => { if (x.status === 'occupied') x.status = 'vacant'; });
  h.status = 'occupied';
  S.housing = 'owned';
  log(`Moved into ${h.name}.`);
  render();
}
window.moveIntoHome = moveIntoHome;

function setHomeForRent(homeId) {
  const h = S.ownedHomes.find(x => x.id === homeId);
  if (!h) return;
  if (h.status === 'occupied') S.housing = 'parents';
  h.status = 'rented';
  log(`${h.name} listed for rent at ${money(h.monthlyRent)}/month.`);
  render();
}
window.setHomeForRent = setHomeForRent;

function stopRenting(homeId) {
  const h = S.ownedHomes.find(x => x.id === homeId);
  if (!h) return;
  h.status = 'vacant';
  log(`${h.name} is now vacant.`);
  render();
}
window.stopRenting = stopRenting;

function sellHome(homeId) {
  ensureRealEstateState();
  const idx = S.ownedHomes.findIndex(x => x.id === homeId);
  if (idx < 0) return;
  const h = S.ownedHomes[idx];
  const contract = S.realestateContracts.find(c => c.homeId === homeId);
  if (contract && contract.remaining > 0) {
    if (!confirm(`Sell ${h.name}? Outstanding ${money(contract.remaining)} will be deducted from proceeds.`)) return;
    const net = h.value - contract.remaining;
    if (net < 0) { log('Cannot sell: owes more than market value.'); render(); return; }
    S.wealth += net;
    S.realestateContracts = S.realestateContracts.filter(c => c.homeId !== homeId);
    log(`Sold ${h.name} for ${money(net)} net.`);
  } else {
    if (!confirm(`Sell ${h.name} for ${money(h.value)}?`)) return;
    S.wealth += h.value;
    log(`Sold ${h.name} for ${money(h.value)}.`);
  }
  if (h.staff.length) log(`Released ${h.staff.length} staff member(s) from ${h.name}.`);
  S.ownedHomes.splice(idx, 1);
  if (S.housing === 'owned') S.housing = 'parents';
  render();
}
window.sellHome = sellHome;

/* ---------- Yearly tick (base: value, maintenance, rent, installments, compound fees) ---------- */
function realEstateYear() {
  if (!S || S.age < 18) return;
  ensureRealEstateState();
  const appreciation = (REAL_ESTATE_CONFIG.appreciationRates[S.country] || 0.04);

  S.ownedHomes.forEach(h => {
    h.value = Math.round(h.value * (1 + appreciation));
    h.condition = Math.max(30, h.condition - 1);

    const maint = Math.round(h.value * 0.01);
    if (maint > 0) {
      S.wealth -= maint;
      log(`Maintenance on ${h.name}: ${money(maint)}.`);
    }

    if (h.status === 'rented') {
      h.monthlyRent = Math.round(h.value * (h.rentalYieldAnnPct || 0.07) / 12);
      const rent = h.monthlyRent * 12;
      S.wealth += rent;
      log(`Rent from ${h.name}: ${money(rent)}/year.`);
    }

    if (h.source === 'compound' && h.compoundId) {
      const compound = (COMPOUNDS[S.country] || []).find(c => c.id === h.compoundId);
      if (compound && compound.compoundFee) {
        const fee = compound.compoundFee * h.area * 12;
        S.wealth -= fee;
        log(`Compound service fee on ${h.name}: ${money(fee)}/year.`);
      }
    }
  });

  S.realestateContracts.forEach(c => {
    if (c.yearsLeft <= 0) return;
    const payment = Math.min(c.remaining, c.annualPayment);
    if (S.wealth < payment) {
      c.remaining = Math.round(c.remaining * 1.05);
      log(`Missed installment on ${c.name}. Balance now ${money(c.remaining)}.`);
      return;
    }
    S.wealth -= payment;
    c.remaining -= payment;
    c.yearsLeft--;
    log(`Installment on ${c.name}: ${money(payment)} paid.`);
  });
  S.realestateContracts = S.realestateContracts.filter(c => c.yearsLeft > 0 && c.remaining > 0);
}
GameHooks.on('year', realEstateYear);

/* ---------- Register sub-tabs (market only; file 16 adds manage tabs) ---------- */
registerRealEstateTab({ id: 'compounds', label: 'Compounds', order: 0, requiresHome: false, render: compoundsSection });
registerRealEstateTab({ id: 'local', label: 'Local', order: 1, requiresHome: false, render: localSection });
registerRealEstateTab({ id: 'lands', label: 'Lands', order: 2, requiresHome: false, render: landsSection });
registerRealEstateTab({ id: 'mine', label: 'Mine', order: 3, requiresHome: false, render: mineSection });

GameHooks.registerTab({ id: 'realestate', label: '🏠 Real Estate', order: 5, view: realEstateView });
