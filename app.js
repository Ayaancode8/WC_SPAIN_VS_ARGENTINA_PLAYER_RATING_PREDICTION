// Application State
let appData = {
    matchInfo: null,
    players: [],
    selectedPlayerId: null,
    filters: {
        search: '',
        team: 'all',
        position: 'all',
        role: 'all'
    },
    sort: {
        field: 'rating',
        order: 'desc'
    }
};

// SVG Circle Constants
const CIRCLE_RADIUS = 42;
const CIRCLE_PERIMETER = 2 * Math.PI * CIRCLE_RADIUS;

// DOM Elements
const pitchTabBtn = document.getElementById('pitchTabBtn');
const listTabBtn = document.getElementById('listTabBtn');
const statsTabBtn = document.getElementById('statsTabBtn');
const pitchViewSection = document.getElementById('pitchViewSection');
const listViewSection = document.getElementById('listViewSection');
const statsViewSection = document.getElementById('statsViewSection');

const pitchPlayersLayer = document.getElementById('pitchPlayersLayer');
const ratingsTableBody = document.getElementById('ratingsTableBody');

const playerSearchInput = document.getElementById('playerSearchInput');
const teamFilterSelect = document.getElementById('teamFilterSelect');
const positionFilterSelect = document.getElementById('positionFilterSelect');
const roleFilterSelect = document.getElementById('roleFilterSelect');

const playerSidebar = document.getElementById('playerSidebar');
const sidebarEmptyState = document.getElementById('sidebarEmptyState');
const sidebarContent = document.getElementById('sidebarContent');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    fetchRatingsData();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Tab switching
    pitchTabBtn.addEventListener('click', () => {
        pitchTabBtn.classList.add('active');
        listTabBtn.classList.remove('active');
        statsTabBtn.classList.remove('active');
        pitchViewSection.classList.remove('hidden');
        listViewSection.classList.add('hidden');
        statsViewSection.classList.add('hidden');
    });

    listTabBtn.addEventListener('click', () => {
        listTabBtn.classList.add('active');
        pitchTabBtn.classList.remove('active');
        statsTabBtn.classList.remove('active');
        listViewSection.classList.remove('hidden');
        pitchViewSection.classList.add('hidden');
        statsViewSection.classList.add('hidden');
        renderListTable(); // Rerender table when showing list view
    });

    statsTabBtn.addEventListener('click', () => {
        statsTabBtn.classList.add('active');
        pitchTabBtn.classList.remove('active');
        listTabBtn.classList.remove('active');
        statsViewSection.classList.remove('hidden');
        pitchViewSection.classList.add('hidden');
        listViewSection.classList.add('hidden');
    });

    // Sidebar closing (for mobile layout)
    closeSidebarBtn.addEventListener('click', () => {
        playerSidebar.classList.remove('open');
    });

    // Filters & Search
    playerSearchInput.addEventListener('input', (e) => {
        appData.filters.search = e.target.value.toLowerCase();
        renderListTable();
    });

    teamFilterSelect.addEventListener('change', (e) => {
        appData.filters.team = e.target.value;
        renderListTable();
    });

    positionFilterSelect.addEventListener('change', (e) => {
        appData.filters.position = e.target.value;
        renderListTable();
    });

    roleFilterSelect.addEventListener('change', (e) => {
        appData.filters.role = e.target.value;
        renderListTable();
    });

    // Table Header Sorting
    document.querySelectorAll('.ratings-table th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.dataset.sort;
            
            // Toggle order or set new field
            if (appData.sort.field === field) {
                appData.sort.order = appData.sort.order === 'asc' ? 'desc' : 'asc';
            } else {
                appData.sort.field = field;
                appData.sort.order = 'desc'; // Default to high-to-low
            }

            // Update UI indicators
            document.querySelectorAll('.ratings-table th.sortable').forEach(header => {
                header.classList.remove('active', 'asc', 'desc');
            });
            th.classList.add('active', appData.sort.order);

            renderListTable();
        });
    });
}

// Fetch rating data from backend API
function fetchRatingsData() {
    fetch('ratings.json')
        .then(response => {
            if (!response.ok) throw new Error('Network error fetching ratings');
            return response.json();
        })
        .then(data => {
            appData.matchInfo = data.matchInfo;
            appData.players = data.players;
            
            renderMatchHeader();
            renderTacticalPitch();
            renderListTable();
        })
        .catch(err => {
            console.error('Error loading ratings data:', err);
            // Display an overlay error to the user if the server is down
            document.body.innerHTML += `
                <div class="api-error-overlay">
                    <div class="api-error-card">
                        <h2>API Connection Error</h2>
                        <p>Could not connect to match ratings server. Please ensure the backend server is running.</p>
                    </div>
                </div>
            `;
        });
}

// Render Header details and timelines
function renderMatchHeader() {
    const info = appData.matchInfo;
    if (!info) return;

    document.getElementById('matchTitle').innerText = info.title;
    document.getElementById('matchStatus').innerText = info.status;
    document.getElementById('matchVenue').innerText = info.venue;
    document.getElementById('matchDate').innerText = info.date;

    const home = info.teams.home;
    const away = info.teams.away;

    document.getElementById('homeFlag').innerText = home.flag;
    document.getElementById('homeName').innerText = home.name;
    document.getElementById('awayFlag').innerText = away.flag;
    document.getElementById('awayName').innerText = away.name;
    document.getElementById('matchScore').innerText = `${home.score} - ${away.score}`;

    // Timeline Goals and Events
    const timeline = document.getElementById('matchTimeline');
    timeline.innerHTML = '';
    
    info.timeline.forEach(event => {
        const isHome = event.team && event.team.toLowerCase() === home.name.toLowerCase();
        const teamClass = isHome ? 'spain-event' : (event.team ? 'arg-event' : 'neutral-event');
        const eventEl = document.createElement('div');
        eventEl.className = `timeline-goal-event ${teamClass}`;
        
        let icon = '⏱️';
        if (event.type === 'goal') icon = '⚽';
        else if (event.type === 'yellow_card') icon = '🟨';
        else if (event.type === 'red_card') icon = '🟥';
        else if (event.type === 'substitution') icon = '🔄';
        else if (event.type === 'kickoff') icon = '⏱️';
        
        let text = event.player || '';
        if (event.type === 'substitution') {
            text = `${event.playerIn} IN, ${event.playerOut} OUT`;
        } else if (event.type === 'kickoff') {
            text = 'Kick off';
        }
        
        eventEl.innerHTML = `
            <span class="timeline-goal-icon">${icon}</span>
            <span class="timeline-goal-player">${text}</span>
            <span class="timeline-goal-min">${event.minute}</span>
            ${event.detail ? `<span class="timeline-goal-detail">(${event.detail})</span>` : ''}
        `;
        timeline.appendChild(eventEl);
    });

    renderMatchStats(info);
}

// Render Match Stats Comparison
function renderMatchStats(info) {
    const statsContainer = document.getElementById('matchStatsComparison');
    if (!statsContainer) return;
    statsContainer.innerHTML = '';
    
    const stats = info.matchStats;
    if (!stats) return;

    const statLabels = {
        totalShots: 'Total Shots',
        shotsOnGoal: 'Shots on Goal',
        shotsOffGoal: 'Shots off Goal',
        blockedShots: 'Blocked Shots',
        goalkeeperSaves: 'Goalkeeper Saves',
        shotsInsideBox: 'Shots inside Box',
        shotsOutsideBox: 'Shots outside Box',
        ballPossession: 'Ball Possession',
        totalPasses: 'Total Passes',
        passesAccurate: 'Accurate Passes',
        cornerKicks: 'Corner Kicks',
        offsides: 'Offsides',
        fouls: 'Fouls',
        yellowCards: 'Yellow Cards',
        redCards: 'Red Cards'
    };

    Object.keys(statLabels).forEach(key => {
        if (stats[key]) {
            const homeVal = stats[key][0];
            const awayVal = stats[key][1];
            
            // Parse values for percentage bars
            let hNum = typeof homeVal === 'string' ? parseFloat(homeVal) : homeVal;
            let aNum = typeof awayVal === 'string' ? parseFloat(awayVal) : awayVal;
            const total = hNum + aNum;
            const hPct = total > 0 ? (hNum / total) * 100 : 50;
            const aPct = total > 0 ? (aNum / total) * 100 : 50;

            const row = document.createElement('div');
            row.className = 'stat-comparison-row';
            row.innerHTML = `
                <div class="stat-comp-header">
                    <span class="stat-val home-val">${homeVal}</span>
                    <span class="stat-name">${statLabels[key]}</span>
                    <span class="stat-val away-val">${awayVal}</span>
                </div>
                <div class="stat-comp-bars">
                    <div class="stat-bar home-bar" style="width: ${hPct}%"></div>
                    <div class="stat-bar away-bar" style="width: ${aPct}%"></div>
                </div>
            `;
            statsContainer.appendChild(row);
        }
    });
}

// Render Players on the Tactical Pitch
function renderTacticalPitch() {
    pitchPlayersLayer.innerHTML = '';
    
    // Only render starting players who have pitch coordinates
    const starters = appData.players.filter(p => p.isStarter && p.pitchX !== undefined && p.pitchY !== undefined);
    
    starters.forEach(player => {
        const playerNode = document.createElement('div');
        playerNode.className = `pitch-player-node team-${player.team.toLowerCase()}`;
        playerNode.style.left = `${player.pitchX}%`;
        playerNode.style.top = `${player.pitchY}%`;
        playerNode.dataset.playerId = player.id;
        
        playerNode.innerHTML = `
            <div class="node-shirt-circle">
                <span class="node-rating">${player.rating.toFixed(2)}</span>
            </div>
            <div class="node-name">${player.name.split(' ').pop()}</div>
        `;

        playerNode.addEventListener('click', () => {
            selectPlayer(player.id);
        });

        pitchPlayersLayer.appendChild(playerNode);
    });
}

// Filter and Sort players for the table view
function getFilteredAndSortedPlayers() {
    let result = [...appData.players];
    const filters = appData.filters;

    // Apply Search
    if (filters.search) {
        result = result.filter(p => p.name.toLowerCase().includes(filters.search));
    }

    // Apply Team Filter
    if (filters.team !== 'all') {
        result = result.filter(p => p.team === filters.team);
    }

    // Apply Position Filter
    if (filters.position !== 'all') {
        result = result.filter(p => p.position === filters.position);
    }

    // Apply Role Filter
    if (filters.role !== 'all') {
        if (filters.role === 'starters') {
            result = result.filter(p => p.isStarter);
        } else if (filters.role === 'subs') {
            result = result.filter(p => !p.isStarter);
        }
    }

    // Apply Sorting
    const sortField = appData.sort.field;
    const sortOrder = appData.sort.order === 'asc' ? 1 : -1;

    result.sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        // Handle nested stats values if needed (currently not sorted by stats, but good practice)
        if (typeof valA === 'string') {
            return valA.localeCompare(valB) * sortOrder;
        }

        return (valA - valB) * sortOrder;
    });

    return result;
}

// Render Player Ratings List (Table)
function renderListTable() {
    ratingsTableBody.innerHTML = '';
    const filteredPlayers = getFilteredAndSortedPlayers();

    if (filteredPlayers.length === 0) {
        ratingsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="table-empty-row">No players match the search criteria.</td>
            </tr>
        `;
        return;
    }

    filteredPlayers.forEach(player => {
        const tr = document.createElement('tr');
        tr.dataset.playerId = player.id;
        if (appData.selectedPlayerId === player.id) {
            tr.classList.add('selected');
        }

        const teamClass = player.team.toLowerCase();
        
        tr.innerHTML = `
            <td>${player.number}</td>
            <td>
                <div class="table-player-name">${player.name}</div>
            </td>
            <td>
                <div class="table-team-badge ${teamClass}">
                    <span class="badge-dot"></span>
                    <span>${player.team}</span>
                </div>
            </td>
            <td>${player.position} (${player.role})</td>
            <td>
                <span class="table-rating-badge pred-val">${player.predictedRating.toFixed(2)}</span>
            </td>
            <td>
                <span class="table-rating-badge match-val">${player.rating.toFixed(2)}</span>
            </td>
            <td>
                <button class="table-row-btn">View Stats</button>
            </td>
        `;

        tr.addEventListener('click', () => {
            selectPlayer(player.id);
        });

        ratingsTableBody.appendChild(tr);
    });
}

// Select a player and update sidebar content
function selectPlayer(playerId) {
    appData.selectedPlayerId = playerId;
    
    // Update Active states in UI
    document.querySelectorAll('.pitch-player-node').forEach(node => {
        if (parseInt(node.dataset.playerId) === playerId) {
            node.classList.add('selected');
        } else {
            node.classList.remove('selected');
        }
    });

    document.querySelectorAll('#ratingsTableBody tr').forEach(row => {
        if (parseInt(row.dataset.playerId) === playerId) {
            row.classList.add('selected');
        } else {
            row.classList.remove('selected');
        }
    });

    // Populate Sidebar Detail Panel
    const player = appData.players.find(p => p.id === playerId);
    if (!player) return;

    // Toggle Empty State / Details state
    sidebarEmptyState.classList.add('hidden');
    sidebarContent.classList.remove('hidden');

    // Slide open sidebar on tablet/mobile screens
    playerSidebar.classList.add('open');

    // Base info
    document.getElementById('sidebarPlayerNumber').innerText = `#${player.number}`;
    document.getElementById('sidebarPlayerTeam').innerText = player.team;
    document.getElementById('sidebarPlayerName').innerText = player.name;
    document.getElementById('sidebarPlayerRole').innerText = `${player.position} (${player.role})`;

    // Team glow badge
    const glowColor = player.team.toLowerCase() === 'spain' ? 'var(--spain-red)' : 'var(--arg-blue)';
    document.getElementById('sidebarTeamGlow').style.background = glowColor;

    // Rating numeric values
    document.getElementById('sidebarMatchRating').innerText = player.rating.toFixed(2);
    document.getElementById('sidebarPredictedRating').innerText = player.predictedRating.toFixed(2);

    // SVG radial progress animations
    const matchBar = document.getElementById('matchRatingCircle');
    const predBar = document.getElementById('predRatingCircle');

    // Reset offsets for animation
    matchBar.style.strokeDashoffset = CIRCLE_PERIMETER;
    predBar.style.strokeDashoffset = CIRCLE_PERIMETER;

    // Trigger reflow to animate correctly
    setTimeout(() => {
        const matchOffset = CIRCLE_PERIMETER - (player.rating / 10) * CIRCLE_PERIMETER;
        const predOffset = CIRCLE_PERIMETER - (player.predictedRating / 10) * CIRCLE_PERIMETER;
        
        matchBar.style.strokeDashoffset = matchOffset;
        predBar.style.strokeDashoffset = predOffset;
    }, 50);

    // Populate detailed stats grid
    const statsGrid = document.getElementById('sidebarStatsGrid');
    statsGrid.innerHTML = '';

    // Add general playing format if present
    if (!player.isStarter && player.stats.minutesPlayed) {
        statsGrid.appendChild(createStatCard('Mins Played', `${player.stats.minutesPlayed}'`));
    }

    // Render all numerical/qualitative stats
    Object.entries(player.stats).forEach(([key, val]) => {
        if (key === 'minutesPlayed') return; // Skip since we handle minutes specially
        
        // Format names nicely (e.g. dribblesCompleted -> Dribbles Completed)
        const title = key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase());
            
        statsGrid.appendChild(createStatCard(title, val));
    });
}

// Utility to create a card inside the stats grid
function createStatCard(title, value) {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = `
        <div class="stat-value">${value}</div>
        <div class="stat-title">${title}</div>
    `;
    return card;
}
