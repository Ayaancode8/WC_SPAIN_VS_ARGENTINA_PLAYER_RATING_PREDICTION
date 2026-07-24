// ===================== APPLICATION STATE =====================
let wcData = null; // Full worldcup_data.json
let currentMainTab = 'overview'; // 'overview' | 'table' | 'match'
let selectedMatchId = null;

let appState = {
    matchInfo: null,
    players: [],
    selectedPlayerId: null,
    filters: { search: '', team: 'all', position: 'all', role: 'all' },
    sort: { field: 'rating', order: 'desc' },
    tableFilters: { search: '', round: 'all' }
};

const CIRCLE_RADIUS = 42;
const CIRCLE_PERIMETER = 2 * Math.PI * CIRCLE_RADIUS;

const ROUND_ORDER = ['1', '2', '3', '1/16', '1/8', '1/4', '1/2', 'bronze', 'final'];
const ROUND_NAMES = {
    '1': 'Round 1', '2': 'Round 2', '3': 'Round 3',
    '1/16': 'Round of 32', '1/8': 'Round of 16', '1/4': 'Quarter-Finals',
    '1/2': 'Semi-Finals', 'bronze': '3rd Place', 'final': 'Final'
};

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
    fetchWorldCupData();
    setupNavListeners();
});

function fetchWorldCupData() {
    fetch('worldcup_data.json')
        .then(r => { if (!r.ok) throw new Error('Network error'); return r.json(); })
        .then(data => {
            wcData = data;
            const overlay = document.getElementById('loadingOverlay');
            if (overlay) { overlay.classList.add('fade-out'); setTimeout(() => overlay.remove(), 500); }
            renderBracket();
        })
        .catch(err => {
            console.error('Error loading data:', err);
            const overlay = document.getElementById('loadingOverlay');
            if (overlay) overlay.querySelector('p').textContent = 'Error loading data. Please refresh.';
        });
}

// ===================== TOP NAV =====================
function setupNavListeners() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.target;
            switchMainTab(target);
        });
    });
}

function switchMainTab(target) {
    currentMainTab = target;
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t.dataset.target === target));
    document.getElementById('overviewSection').classList.toggle('hidden', target !== 'overview');
    document.getElementById('tableSection').classList.toggle('hidden', target !== 'table');
    document.getElementById('matchSection').classList.toggle('hidden', target !== 'match');
    
    const uclSec = document.getElementById('champions_leagueSection');
    if (uclSec) uclSec.classList.toggle('hidden', target !== 'champions_league');

    const eplSec = document.getElementById('premier_leagueSection');
    if (eplSec) eplSec.classList.toggle('hidden', target !== 'premier_league');

    if (target === 'table' && wcData) renderMatchesTable();
    if (target === 'match' && selectedMatchId && wcData) loadMatchDetails(selectedMatchId);
}

// ===================== BRACKET RENDERING =====================
function renderBracket() {
    const container = document.getElementById('bracketContainer');
    if (!container || !wcData) return;
    container.innerHTML = '';

    const knockoutRounds = ['1/16', '1/8', '1/4', '1/2', 'final'];
    const tree = wcData.knockoutTree;

    knockoutRounds.forEach(roundCode => {
        const matches = tree[roundCode] || [];
        const roundDiv = document.createElement('div');
        roundDiv.className = 'bracket-round';

        const title = document.createElement('div');
        title.className = 'bracket-round-title';
        title.textContent = ROUND_NAMES[roundCode] || roundCode;
        roundDiv.appendChild(title);

        const matchesDiv = document.createElement('div');
        matchesDiv.className = 'bracket-matches';

        matches.forEach(m => {
            const card = document.createElement('div');
            card.className = 'bracket-match-card';
            card.dataset.matchId = m.matchId;

            const winnerClean = (m.winner || '').trim().toLowerCase();
            const homeWin = winnerClean === m.homeTeam.trim().toLowerCase();
            const awayWin = winnerClean === m.awayTeam.trim().toLowerCase();

            card.innerHTML = `
                <div class="bracket-team-row ${homeWin ? 'winner' : ''}">
                    <span class="bracket-team-flag">${m.homeFlag}</span>
                    <span class="bracket-team-name">${m.homeTeam}</span>
                    <span class="bracket-team-score">${m.homeScore}</span>
                </div>
                <div class="bracket-team-row ${awayWin ? 'winner' : ''}">
                    <span class="bracket-team-flag">${m.awayFlag}</span>
                    <span class="bracket-team-name">${m.awayTeam}</span>
                    <span class="bracket-team-score">${m.awayScore}</span>
                </div>
            `;
            card.addEventListener('click', () => openMatch(m.matchId));
            matchesDiv.appendChild(card);
        });
        roundDiv.appendChild(matchesDiv);
        container.appendChild(roundDiv);
    });
}

// ===================== MATCHES TABLE =====================
function renderMatchesTable() {
    const tbody = document.getElementById('matchesTableBody');
    if (!tbody || !wcData) return;
    tbody.innerHTML = '';

    const searchInput = document.getElementById('matchSearchInput');
    const roundSelect = document.getElementById('roundFilterSelect');

    // Remove old listeners and re-add
    const newSearch = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearch, searchInput);
    newSearch.addEventListener('input', () => { appState.tableFilters.search = newSearch.value.toLowerCase(); renderMatchesTable(); });

    const newRound = roundSelect.cloneNode(true);
    roundSelect.parentNode.replaceChild(newRound, roundSelect);
    newRound.addEventListener('change', () => { appState.tableFilters.round = newRound.value; renderMatchesTable(); });

    newSearch.value = appState.tableFilters.search;
    newRound.value = appState.tableFilters.round;

    let matchesList = Object.values(wcData.matches);

    // Sort by round order
    matchesList.sort((a, b) => ROUND_ORDER.indexOf(a.roundCode) - ROUND_ORDER.indexOf(b.roundCode));

    // Filters
    if (appState.tableFilters.round !== 'all') {
        matchesList = matchesList.filter(m => m.roundCode === appState.tableFilters.round);
    }
    if (appState.tableFilters.search) {
        const q = appState.tableFilters.search;
        matchesList = matchesList.filter(m =>
            m.teams.home.name.toLowerCase().includes(q) || m.teams.away.name.toLowerCase().includes(q)
        );
    }

    matchesList.forEach(m => {
        const tr = document.createElement('tr');
        const isTie = !m.winner || m.winner.toLowerCase() === 'tie';
        const winnerBadge = isTie
            ? `<span class="table-winner-badge tie">🤝 Draw</span>`
            : `<span class="table-winner-badge win">🏆 ${m.winner}</span>`;

        tr.innerHTML = `
            <td><span class="match-round-pill">${ROUND_NAMES[m.roundCode] || m.roundCode}</span></td>
            <td><div class="match-team-cell"><span class="team-flag">${m.teams.home.flag}</span> ${m.teams.home.name}</div></td>
            <td class="match-score-cell">${m.teams.home.score} - ${m.teams.away.score}</td>
            <td><div class="match-team-cell"><span class="team-flag">${m.teams.away.flag}</span> ${m.teams.away.name}</div></td>
            <td class="match-winner-cell">${winnerBadge}</td>
            <td><button class="match-view-btn">View</button></td>
        `;
        tr.addEventListener('click', () => openMatch(m.matchId));
        tbody.appendChild(tr);
    });
}

// ===================== OPEN MATCH =====================
function openMatch(matchId) {
    selectedMatchId = matchId;
    switchMainTab('match');
}

// ===================== MATCH DETAILS =====================
function loadMatchDetails(matchId) {
    const match = wcData.matches[matchId];
    if (!match) return;

    appState.matchInfo = match;
    appState.players = match.players || [];
    appState.selectedPlayerId = null;

    // Reset sidebar
    const emptyState = document.getElementById('sidebarEmptyState');
    const sidebarContent = document.getElementById('sidebarContent');
    if (emptyState) emptyState.classList.remove('hidden');
    if (sidebarContent) sidebarContent.classList.add('hidden');

    // Set dynamic team CSS colors
    document.documentElement.style.setProperty('--home-color', match.teams.home.color);
    document.documentElement.style.setProperty('--away-color', match.teams.away.color);

    renderMatchHeader();
    renderTacticalPitch();
    setupMatchDetailListeners();

    // Default to pitch tab
    activateMatchSubTab('pitch');
}

function renderMatchHeader() {
    const m = appState.matchInfo;
    if (!m) return;

    document.getElementById('matchTitle').textContent = m.roundTitle;
    document.getElementById('matchStatus').textContent = m.status;
    document.getElementById('matchVenue').textContent = m.venue;
    document.getElementById('matchDate').textContent = m.date;
    document.getElementById('homeFlag').textContent = m.teams.home.flag;
    document.getElementById('homeName').textContent = m.teams.home.name;
    document.getElementById('awayFlag').textContent = m.teams.away.flag;
    document.getElementById('awayName').textContent = m.teams.away.name;
    document.getElementById('matchScore').textContent = `${m.teams.home.score} - ${m.teams.away.score}`;

    // Winning Team Badge
    const winnerBadge = document.getElementById('matchWinnerBadge');
    if (winnerBadge) {
        if (m.winner && m.winner.toLowerCase() !== 'tie') {
            const isHome = m.winner.toLowerCase() === m.teams.home.name.toLowerCase();
            const isAway = m.winner.toLowerCase() === m.teams.away.name.toLowerCase();
            const flag = isHome ? m.teams.home.flag : (isAway ? m.teams.away.flag : '🏆');
            winnerBadge.innerHTML = `👑 Winner: <strong>${m.winner}</strong> ${flag}`;
            winnerBadge.className = 'winner-badge highlight-winner';
        } else {
            winnerBadge.innerHTML = `🤝 Result: <strong>Draw / Tie</strong>`;
            winnerBadge.className = 'winner-badge tie-winner';
        }
    }

    // Legend labels
    document.getElementById('homeLegendLabel').textContent = m.teams.home.name + ' Player';
    document.getElementById('awayLegendLabel').textContent = m.teams.away.name + ' Player';

    // Team filter dropdown for player list
    const teamSelect = document.getElementById('teamFilterSelect');
    if (teamSelect) {
        teamSelect.innerHTML = `<option value="all">All Teams</option>
            <option value="${m.teams.home.name}">${m.teams.home.name} ${m.teams.home.flag}</option>
            <option value="${m.teams.away.name}">${m.teams.away.name} ${m.teams.away.flag}</option>`;
    }

    // Timeline
    const timeline = document.getElementById('matchTimeline');
    timeline.innerHTML = '';
    (m.timeline || []).forEach(event => {
        const isHome = event.team && event.team.toLowerCase() === m.teams.home.name.toLowerCase();
        const teamClass = isHome ? 'home-event' : (event.team ? 'away-event' : 'neutral-event');
        const el = document.createElement('div');
        el.className = `timeline-goal-event ${teamClass}`;
        el.style.borderLeftColor = isHome ? m.teams.home.color : (event.team ? m.teams.away.color : 'var(--text-muted)');

        let icon = '⏱️';
        if (event.type === 'goal') icon = '⚽';
        else if (event.type === 'yellow_card') icon = '🟨';
        else if (event.type === 'red_card') icon = '🟥';
        else if (event.type === 'substitution') icon = '🔄';

        let text = event.player || '';
        if (event.type === 'substitution') text = `${event.playerIn} IN, ${event.playerOut} OUT`;

        el.innerHTML = `
            <span class="timeline-goal-icon">${icon}</span>
            <span class="timeline-goal-player">${text}</span>
            <span class="timeline-goal-min">${event.minute}</span>
            ${event.detail ? `<span class="timeline-goal-detail">(${event.detail})</span>` : ''}
        `;
        timeline.appendChild(el);
    });

    renderMatchStats(m);
}

function renderMatchStats(m) {
    const container = document.getElementById('matchStatsComparison');
    if (!container) return;
    container.innerHTML = '';
    const stats = m.matchStats;
    if (!stats) return;

    Object.keys(stats).forEach(key => {
        const pair = stats[key];
        if (!pair || pair.length < 2) return;

        const homeVal = pair[0];
        const awayVal = pair[1];
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());

        let hNum = typeof homeVal === 'string' ? parseFloat(homeVal) : homeVal;
        let aNum = typeof awayVal === 'string' ? parseFloat(awayVal) : awayVal;
        if (isNaN(hNum)) hNum = 0;
        if (isNaN(aNum)) aNum = 0;
        const total = hNum + aNum;
        const hPct = total > 0 ? (hNum / total) * 100 : 50;
        const aPct = total > 0 ? (aNum / total) * 100 : 50;

        const row = document.createElement('div');
        row.className = 'stat-comparison-row';
        row.innerHTML = `
            <div class="stat-comp-header">
                <span class="stat-val home-val" style="color:var(--home-color)">${homeVal}</span>
                <span class="stat-name">${label}</span>
                <span class="stat-val away-val" style="color:var(--away-color)">${awayVal}</span>
            </div>
            <div class="stat-comp-bars">
                <div class="stat-bar home-bar" style="width:${hPct}%"></div>
                <div class="stat-bar away-bar" style="width:${aPct}%"></div>
            </div>
        `;
        container.appendChild(row);
    });
}

// ===================== TACTICAL PITCH =====================
function renderTacticalPitch() {
    const layer = document.getElementById('pitchPlayersLayer');
    if (!layer) return;
    layer.innerHTML = '';

    const m = appState.matchInfo;
    const homeName = m.teams.home.name.toLowerCase();
    const starters = appState.players.filter(p => p.isStarter && p.pitchX != null && p.pitchY != null);

    starters.forEach(player => {
        const node = document.createElement('div');
        const isHome = player.team.toLowerCase() === homeName;
        node.className = `pitch-player-node ${isHome ? 'team-home' : 'team-away'}`;
        node.style.left = `${player.pitchX}%`;
        node.style.top = `${player.pitchY}%`;
        node.dataset.playerId = player.id;

        const displayRating = (player.predictedRating !== undefined && player.predictedRating !== null)
            ? Number(player.predictedRating).toFixed(1)
            : (player.rating !== undefined && player.rating !== null ? Number(player.rating).toFixed(1) : '—');

        node.innerHTML = `
            <div class="node-shirt-circle"><span class="node-rating">${displayRating}</span></div>
            <div class="node-name">${player.name.split(' ').pop()}</div>
        `;
        node.addEventListener('click', () => selectPlayer(player.id));
        layer.appendChild(node);
    });
}

// ===================== PLAYER LIST TABLE =====================
function renderListTable() {
    const tbody = document.getElementById('ratingsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filtered = getFilteredSortedPlayers();
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted)">No players match criteria.</td></tr>';
        return;
    }

    filtered.forEach(p => {
        const tr = document.createElement('tr');
        tr.dataset.playerId = p.id;
        if (appState.selectedPlayerId === p.id) tr.classList.add('selected');

        const rating = p.rating != null ? p.rating.toFixed(2) : '—';
        const pred = p.predictedRating != null ? p.predictedRating.toFixed(2) : '—';

        tr.innerHTML = `
            <td>${p.number || '—'}</td>
            <td><div class="table-player-name">${p.name}</div></td>
            <td><div class="table-team-badge"><span class="badge-dot" style="background:var(--${p.team.toLowerCase() === appState.matchInfo.teams.home.name.toLowerCase() ? 'home' : 'away'}-color);box-shadow:0 0 6px var(--${p.team.toLowerCase() === appState.matchInfo.teams.home.name.toLowerCase() ? 'home' : 'away'}-color)"></span><span>${p.team}</span></div></td>
            <td>${p.position} (${p.role})</td>
            <td><span class="table-rating-badge pred-val">${pred}</span></td>
            <td><span class="table-rating-badge match-val">${rating}</span></td>
            <td><button class="table-row-btn">View Stats</button></td>
        `;
        tr.addEventListener('click', () => selectPlayer(p.id));
        tbody.appendChild(tr);
    });
}

function getFilteredSortedPlayers() {
    let result = [...appState.players];
    const f = appState.filters;

    if (f.search) {
        const q = f.search.trim().toLowerCase();
        result = result.filter(p => (p.name || '').toLowerCase().includes(q));
    }
    if (f.team && f.team !== 'all') {
        const t = f.team.trim().toLowerCase();
        result = result.filter(p => (p.team || '').trim().toLowerCase() === t);
    }
    if (f.position && f.position !== 'all') {
        const pos = f.position.trim().toLowerCase();
        result = result.filter(p => (p.position || '').trim().toLowerCase() === pos);
    }
    if (f.role === 'starters') {
        result = result.filter(p => p.isStarter);
    } else if (f.role === 'subs') {
        result = result.filter(p => !p.isStarter);
    }

    const sf = appState.sort.field;
    const so = appState.sort.order === 'asc' ? 1 : -1;
    result.sort((a, b) => {
        let va = a[sf], vb = b[sf];
        if (va == null) va = -999; if (vb == null) vb = -999;
        if (typeof va === 'string') return va.localeCompare(vb) * so;
        return (va - vb) * so;
    });
    return result;
}

// ===================== SELECT PLAYER (SIDEBAR) =====================
function selectPlayer(playerId) {
    appState.selectedPlayerId = playerId;

    document.querySelectorAll('.pitch-player-node').forEach(n => n.classList.toggle('selected', parseInt(n.dataset.playerId) === playerId));
    document.querySelectorAll('#ratingsTableBody tr').forEach(r => r.classList.toggle('selected', parseInt(r.dataset.playerId) === playerId));

    const player = appState.players.find(p => p.id === playerId);
    if (!player) return;

    document.getElementById('sidebarEmptyState').classList.add('hidden');
    document.getElementById('sidebarContent').classList.remove('hidden');
    document.getElementById('playerSidebar').classList.add('open');

    document.getElementById('sidebarPlayerNumber').textContent = `#${player.number || '—'}`;
    document.getElementById('sidebarPlayerTeam').textContent = player.team;
    document.getElementById('sidebarPlayerName').textContent = player.name;
    document.getElementById('sidebarPlayerRole').textContent = `${player.position} (${player.role})`;

    const isHome = player.team.toLowerCase() === appState.matchInfo.teams.home.name.toLowerCase();
    document.getElementById('sidebarTeamGlow').style.background = isHome ? 'var(--home-color)' : 'var(--away-color)';

    const matchRating = player.rating != null ? player.rating.toFixed(2) : '—';
    const predRating = player.predictedRating != null ? player.predictedRating.toFixed(2) : '—';
    document.getElementById('sidebarMatchRating').textContent = matchRating;
    document.getElementById('sidebarPredictedRating').textContent = predRating;

    // Animate rating circles
    const matchBar = document.getElementById('matchRatingCircle');
    const predBar = document.getElementById('predRatingCircle');
    matchBar.style.strokeDashoffset = CIRCLE_PERIMETER;
    predBar.style.strokeDashoffset = CIRCLE_PERIMETER;
    setTimeout(() => {
        const mr = player.rating || 0;
        const pr = player.predictedRating || 0;
        matchBar.style.strokeDashoffset = CIRCLE_PERIMETER - (mr / 10) * CIRCLE_PERIMETER;
        predBar.style.strokeDashoffset = CIRCLE_PERIMETER - (pr / 10) * CIRCLE_PERIMETER;
    }, 50);

    // Stats grid
    const grid = document.getElementById('sidebarStatsGrid');
    grid.innerHTML = '';
    if (!player.isStarter && player.stats.minutesPlayed) {
        grid.appendChild(makeStatCard('Mins Played', `${player.stats.minutesPlayed}'`));
    }
    Object.entries(player.stats).forEach(([key, val]) => {
        if (key === 'minutesPlayed') return;
        const title = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
        grid.appendChild(makeStatCard(title, val));
    });
}

function makeStatCard(title, value) {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = `<div class="stat-value">${value}</div><div class="stat-title">${title}</div>`;
    return card;
}

// ===================== MATCH DETAIL SUB-TABS =====================
function setupMatchDetailListeners() {
    const pitchBtn = document.getElementById('pitchTabBtn');
    const listBtn = document.getElementById('listTabBtn');
    const statsBtn = document.getElementById('statsTabBtn');
    const backBtn = document.getElementById('backToOverviewBtn');
    const closeBtn = document.getElementById('closeSidebarBtn');

    // Clone to remove old listeners
    [pitchBtn, listBtn, statsBtn, backBtn, closeBtn].forEach(el => {
        if (!el) return;
        const clone = el.cloneNode(true);
        el.parentNode.replaceChild(clone, el);
    });

    document.getElementById('pitchTabBtn').addEventListener('click', () => activateMatchSubTab('pitch'));
    document.getElementById('listTabBtn').addEventListener('click', () => activateMatchSubTab('list'));
    document.getElementById('statsTabBtn').addEventListener('click', () => activateMatchSubTab('stats'));
    document.getElementById('backToOverviewBtn').addEventListener('click', () => switchMainTab('overview'));
    document.getElementById('closeSidebarBtn').addEventListener('click', () => document.getElementById('playerSidebar').classList.remove('open'));

    // Player list filters
    const setupFilter = (id, stateKey) => {
        const el = document.getElementById(id);
        if (!el) return;
        const clone = el.cloneNode(true);
        el.parentNode.replaceChild(clone, el);
        clone.addEventListener(clone.tagName === 'SELECT' ? 'change' : 'input', (e) => {
            appState.filters[stateKey] = e.target.value;
            renderListTable();
        });
    };
    setupFilter('playerSearchInput', 'search');
    setupFilter('teamFilterSelect', 'team');
    setupFilter('positionFilterSelect', 'position');
    setupFilter('roleFilterSelect', 'role');

    // Table sorting
    document.querySelectorAll('.ratings-table th.sortable').forEach(th => {
        const clone = th.cloneNode(true);
        th.parentNode.replaceChild(clone, th);
        clone.addEventListener('click', () => {
            const field = clone.dataset.sort;
            if (appState.sort.field === field) appState.sort.order = appState.sort.order === 'asc' ? 'desc' : 'asc';
            else { appState.sort.field = field; appState.sort.order = 'desc'; }
            document.querySelectorAll('.ratings-table th.sortable').forEach(h => h.classList.remove('active', 'asc', 'desc'));
            clone.classList.add('active', appState.sort.order);
            renderListTable();
        });
    });
}

function activateMatchSubTab(tab) {
    const pitchBtn = document.getElementById('pitchTabBtn');
    const listBtn = document.getElementById('listTabBtn');
    const statsBtn = document.getElementById('statsTabBtn');

    [pitchBtn, listBtn, statsBtn].forEach(b => b && b.classList.remove('active'));
    document.getElementById('pitchViewSection').classList.add('hidden');
    document.getElementById('listViewSection').classList.add('hidden');
    document.getElementById('statsViewSection').classList.add('hidden');

    if (tab === 'pitch') {
        pitchBtn && pitchBtn.classList.add('active');
        document.getElementById('pitchViewSection').classList.remove('hidden');
    } else if (tab === 'list') {
        listBtn && listBtn.classList.add('active');
        document.getElementById('listViewSection').classList.remove('hidden');
        renderListTable();
    } else {
        statsBtn && statsBtn.classList.add('active');
        document.getElementById('statsViewSection').classList.remove('hidden');
    }
}
