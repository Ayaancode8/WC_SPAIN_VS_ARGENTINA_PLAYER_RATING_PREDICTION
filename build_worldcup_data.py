import csv
import json
import glob
import os
import re
import math

CSV_PATH = "/home/robot/.gemini/antigravity/scratch/match-ratings-web/Predicted_Ratings_complete.csv"
OUT_PATH = "/home/robot/.gemini/antigravity/scratch/match-ratings-web/worldcup_data.json"

# Country Flags & Primary UI Colors
TEAM_META = {
    "Algeria": {"flag": "🇩🇿", "color": "#006633"},
    "Argentina": {"flag": "🇦🇷", "color": "#75aadb"},
    "Australia": {"flag": "🇦🇺", "color": "#ffcd00"},
    "Austria": {"flag": "🇦🇹", "color": "#ed2939"},
    "Belgium": {"flag": "🇧🇪", "color": "#e30613"},
    "Bosnia and Herzegovina": {"flag": "🇧🇦", "color": "#002395"},
    "Bosnia Herzegovina": {"flag": "🇧🇦", "color": "#002395"},
    "Brazil": {"flag": "🇧🇷", "color": "#ffdf00"},
    "Canada": {"flag": "🇨🇦", "color": "#ff0000"},
    "Cape Verde": {"flag": "🇨🇻", "color": "#002b7f"},
    "Cape Verde Islands": {"flag": "🇨🇻", "color": "#002b7f"},
    "Colombia": {"flag": "🇨🇴", "color": "#fcd116"},
    "DR Congo": {"flag": "🇨🇩", "color": "#007fff"},
    "Congo DR": {"flag": "🇨🇩", "color": "#007fff"},
    "Dr Congo": {"flag": "🇨🇩", "color": "#007fff"},
    "Croatia": {"flag": "🇭🇷", "color": "#ff0000"},
    "Curacao": {"flag": "🇨🇼", "color": "#002b7f"},
    "Curaçao": {"flag": "🇨🇼", "color": "#002b7f"},
    "Czechia": {"flag": "🇨🇿", "color": "#d7141a"},
    "Czech Republic": {"flag": "🇨🇿", "color": "#d7141a"},
    "Ivory Coast": {"flag": "🇨🇮", "color": "#ff8200"},
    "Côte d'Ivoire": {"flag": "🇨🇮", "color": "#ff8200"},
    "Ecuador": {"flag": "🇪🇨", "color": "#ffdd00"},
    "Egypt": {"flag": "🇪🇬", "color": "#c8102e"},
    "England": {"flag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "color": "#cf081f"},
    "France": {"flag": "🇫🇷", "color": "#002395"},
    "Germany": {"flag": "🇩🇪", "color": "#222222"},
    "Ghana": {"flag": "🇬🇭", "color": "#ef3340"},
    "Haiti": {"flag": "🇭🇹", "color": "#d21034"},
    "Iran": {"flag": "🇮🇷", "color": "#239f40"},
    "Iraq": {"flag": "🇮🇶", "color": "#ce1126"},
    "Japan": {"flag": "🇯🇵", "color": "#000555"},
    "Jordan": {"flag": "🇯🇴", "color": "#007a3d"},
    "South Korea": {"flag": "🇰🇷", "color": "#0047a0"},
    "Korea Republic": {"flag": "🇰🇷", "color": "#0047a0"},
    "Mexico": {"flag": "🇲🇽", "color": "#006847"},
    "Morocco": {"flag": "🇲🇦", "color": "#c1272d"},
    "Netherlands": {"flag": "🇳🇱", "color": "#ff4f00"},
    "New Zealand": {"flag": "🇳🇿", "color": "#00247d"},
    "Norway": {"flag": "🇳🇴", "color": "#ef2b2d"},
    "Panama": {"flag": "🇵🇦", "color": "#da121a"},
    "Paraguay": {"flag": "🇵🇾", "color": "#d52b1e"},
    "Portugal": {"flag": "🇵🇹", "color": "#046a38"},
    "Qatar": {"flag": "🇶🇦", "color": "#8a1538"},
    "Saudi Arabia": {"flag": "🇸🇦", "color": "#006c35"},
    "Scotland": {"flag": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "color": "#005eb8"},
    "Senegal": {"flag": "🇸🇳", "color": "#00853f"},
    "South Africa": {"flag": "🇿🇦", "color": "#007749"},
    "Spain": {"flag": "🇪🇸", "color": "#e02626"},
    "Sweden": {"flag": "🇸🇪", "color": "#006aa7"},
    "Switzerland": {"flag": "🇨🇭", "color": "#da291c"},
    "Tunisia": {"flag": "🇹🇳", "color": "#e70013"},
    "Turkiye": {"flag": "🇹🇷", "color": "#e30a17"},
    "Turkey": {"flag": "🇹🇷", "color": "#e30a17"},
    "USA": {"flag": "🇺🇸", "color": "#002868"},
    "Usa": {"flag": "🇺🇸", "color": "#002868"},
    "Uruguay": {"flag": "🇺🇾", "color": "#0038a8"},
    "Uzbekistan": {"flag": "🇺🇿", "color": "#0099b5"}
}

ALIAS = {
    'curacao': 'curacao', 'curaao': 'curacao',
    'cotedivoire': 'ivorycoast', 'ivorycoast': 'ivorycoast',
    'czechrepublic': 'czechia', 'czechia': 'czechia',
    'korearepublic': 'southkorea', 'southkorea': 'southkorea',
    'turkey': 'turkiye', 'turkiye': 'turkiye',
    'bosniaandherzegovina': 'bosniaherzegovina', 'bosniaherzegovina': 'bosniaherzegovina',
    'drcongo': 'drcongo', 'congodr': 'drcongo',
    'unitedstates': 'usa', 'usa': 'usa',
    'capeverdeislands': 'capeverde', 'capeverde': 'capeverde',
    'saudiarabia': 'saudiarabia', 'newzealand': 'newzealand', 'southafrica': 'southafrica'
}

ROUND_NAMES = {
    '1': 'Round 1 (Group Stage)',
    '2': 'Round 2 (Group Stage)',
    '3': 'Round 3 (Group Stage)',
    '1/16': 'Round of 32',
    '1/8': 'Round of 16',
    '1/4': 'Quarter-Finals',
    '1/2': 'Semi-Finals',
    'bronze': '3rd Place Playoff',
    'final': 'World Cup Final'
}

def clean_name(s):
    s = s.replace('ç', 'c').replace('ô', 'o').replace('é', 'e').replace('è', 'e').replace('â', 'a')
    raw = re.sub(r'[^a-z0-9]', '', s.lower())
    return ALIAS.get(raw, raw)

def get_team_info(team_name):
    tname = team_name.strip() if team_name else "Unknown"
    meta = TEAM_META.get(tname, {"flag": "🏳️", "color": "#666666"})
    return {
        "name": tname,
        "flag": meta["flag"],
        "color": meta["color"]
    }

def safe_float(val):
    if val is None or val == '' or val == 'nan':
        return None
    try:
        v = float(val)
        if math.isnan(v):
            return None
        return v
    except (ValueError, TypeError):
        return None

def safe_int(val):
    f = safe_float(val)
    return int(f) if f is None else int(f)

POS_MAP = {"0": "Goalkeeper", "1": "Defender", "2": "Midfielder", "3": "Forward"}

def build_dataset():
    # 1. Map events & stats files
    event_files = glob.glob('match_events/*.csv')
    stat_files = glob.glob('Match_team_stats/*.csv')

    event_map = {}
    for ef in event_files:
        base = os.path.basename(ef).replace('_events.csv', '')
        parts = base.split('vs')
        if len(parts) == 2:
            t1, t2 = clean_name(parts[0]), clean_name(parts[1])
            event_map[(t1, t2)] = ef
            event_map[(t2, t1)] = ef

    stat_map = {}
    for sf in stat_files:
        base = os.path.basename(sf).replace('_match_stat.csv', '')
        parts = base.split('vs')
        if len(parts) == 2:
            t1, t2 = clean_name(parts[0]), clean_name(parts[1])
            stat_map[(t1, t2)] = sf
            stat_map[(t2, t1)] = sf

    # 2. Read predicted_ratings_output.csv
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    match_groups = {}
    for r in rows:
        mid = r['match_id']
        match_groups.setdefault(mid, []).append(r)

    matches_out = {}
    
    for mid, mrows in match_groups.items():
        first_row = mrows[0]
        round_code = first_row['match_round'].strip()
        round_display = ROUND_NAMES.get(round_code, round_code)
        winner_raw = first_row.get('winning_team', '').strip()

        # Identify teams in match
        teams_in_match = list(dict.fromkeys([r['teamName'].strip() for r in mrows if r.get('teamName')]))
        if len(teams_in_match) < 2:
            opp = first_row.get('opponent_teamName', '').strip()
            if opp and opp not in teams_in_match:
                teams_in_match.append(opp)
        
        if len(teams_in_match) < 2:
            teams_in_match.append("Opponent")

        home_team_name = teams_in_match[0]
        away_team_name = teams_in_match[1]

        t1_clean = clean_name(home_team_name)
        t2_clean = clean_name(away_team_name)

        efile = event_map.get((t1_clean, t2_clean))
        sfile = stat_map.get((t1_clean, t2_clean))

        # Parse Match Stats CSV
        match_stats_dict = {}
        home_score = 0
        away_score = 0
        
        if sfile:
            with open(sfile, 'r', encoding='utf-8') as sf:
                sreader = csv.DictReader(sf)
                # identify header columns
                cols = sreader.fieldnames or []
                s_home_col = cols[1] if len(cols) > 1 else home_team_name
                s_away_col = cols[2] if len(cols) > 2 else away_team_name

                # check if stat file header order matches home/away
                swap = False
                if clean_name(s_home_col) == t2_clean or clean_name(s_away_col) == t1_clean:
                    swap = True

                for srow in sreader:
                    sname = srow.get('stats_name', '').strip()
                    if not sname: continue
                    val1 = srow.get(s_home_col, '0')
                    val2 = srow.get(s_away_col, '0')
                    if swap:
                        val1, val2 = val2, val1
                    
                    # Store stat key -> [homeVal, awayVal]
                    key_camel = re.sub(r'[^a-zA-Z0-9]', '', sname.title())
                    key_camel = key_camel[0].lower() + key_camel[1:] if key_camel else sname
                    match_stats_dict[key_camel] = [val1, val2]
                    
                    # Capture goals if present in stat
                    if sname.lower() == 'goals':
                        try:
                            home_score = int(val1)
                            away_score = int(val2)
                        except: pass

        # Parse Event Timeline CSV
        timeline = []
        if efile:
            with open(efile, 'r', encoding='utf-8') as ef:
                ereader = csv.DictReader(ef)
                for erow in ereader:
                    etype = erow.get('type')
                    if not etype: continue
                    time_str = erow.get('timeStr', '')
                    if not time_str: continue
                    min_disp = f"{time_str}'" if time_str.isdigit() else time_str
                    
                    is_home_event = erow.get('isHome') == 'True'
                    event_team = home_team_name if is_home_event else away_team_name

                    card = erow.get('card', '')
                    fullname = erow.get('fullName', '')
                    sub_name = erow.get('substitution_name', '')
                    goal_desc = erow.get('goalDescription') or erow.get('assistStr') or ''

                    if etype == 'Goal':
                        timeline.append({
                            "minute": min_disp,
                            "team": event_team,
                            "type": "goal",
                            "player": fullname or "Goal",
                            "detail": goal_desc
                        })
                        if not match_stats_dict.get('goals'):
                            if is_home_event: home_score += 1
                            else: away_score += 1

                    elif etype == 'Card':
                        timeline.append({
                            "minute": min_disp,
                            "team": event_team,
                            "type": "yellow_card" if "Yellow" in card else "red_card",
                            "player": fullname or "Player"
                        })
                    elif etype == 'Substitution':
                        timeline.append({
                            "minute": min_disp,
                            "team": event_team,
                            "type": "substitution",
                            "playerIn": sub_name or "Sub",
                            "playerOut": fullname or "Player"
                        })

        # Calculate goals if not derived
        if home_score == 0 and away_score == 0 and timeline:
            home_score = sum(1 for e in timeline if e['type'] == 'goal' and e['team'] == home_team_name)
            away_score = sum(1 for e in timeline if e['type'] == 'goal' and e['team'] == away_team_name)

        # Parse Players in Match
        players = []
        for prow in mrows:
            try:
                pid = int(float(prow.get('id') or prow.get('player_id') or 0))
            except:
                pid = 0
            if not pid: continue

            pname = prow.get('name', 'Unknown')
            pteam = prow.get('teamName', '').strip()
            is_gk = prow.get('isGoalkeeper') == 'True' or prow.get('usualPosition') == '0'

            shirt = safe_int(prow.get('shirtNumber'))
            usual_pos_raw = prow.get('usualPosition', '')
            usual_pos_key = str(safe_int(usual_pos_raw)) if safe_float(usual_pos_raw) is not None else None
            position = POS_MAP.get(usual_pos_key, "Midfielder")
            if is_gk: position = "Goalkeeper"

            fm_rating = safe_float(prow.get('FotMob rating')) or 6.0
            pred_rating = safe_float(prow.get('predicted_rating')) or fm_rating

            # Pitch coordinates from plot_x and plot_y
            plot_x_raw = prow.get('plot_x')
            plot_y_raw = prow.get('plot_y')

            plot_x_val = safe_float(plot_x_raw)
            plot_y_val = safe_float(plot_y_raw)

            pitch_x = None
            pitch_y = None
            is_starter = False

            if plot_x_val is not None and plot_y_val is not None:
                is_starter = True
                pitch_x = round((plot_x_val / 120.0) * 100.0, 2)
                pitch_y = round((plot_y_val / 80.0) * 100.0, 2)
            else:
                mins = safe_float(prow.get('Minutes played'))
                is_starter = mins is not None and mins >= 90

            # Build player performance stats
            pstats = {}
            def add_pstat(key, csv_col, is_int=False):
                val = safe_float(prow.get(csv_col))
                if val is not None:
                    pstats[key] = int(val) if is_int else round(val, 2)

            add_pstat("minutesPlayed", "Minutes played", True)
            add_pstat("goals", "Goals", True)
            add_pstat("assists", "Assists", True)
            add_pstat("xG", "Expected goals (xG)")
            add_pstat("xA", "Expected assists (xA)")
            add_pstat("totalShots", "Total shots", True)
            add_pstat("passesCompleted", "Accurate passes", True)
            add_pstat("passesAttempted", "Accurate passes_total", True)
            add_pstat("chancesCreated", "Chances created", True)
            add_pstat("shotsOnTarget", "Shots on target", True)
            add_pstat("shotsOffTarget", "Shots off target", True)
            add_pstat("touches", "Touches", True)
            add_pstat("successfulDribbles", "Successful dribbles", True)
            add_pstat("tackles", "Tackles", True)
            add_pstat("interceptions", "Interceptions", True)
            add_pstat("clearances", "Clearances", True)
            add_pstat("recoveries", "Recoveries", True)
            add_pstat("foulsCommitted", "Fouls committed", True)
            add_pstat("wasFouled", "Was fouled", True)

            if pstats.get("passesCompleted") is not None and pstats.get("passesAttempted") and pstats["passesAttempted"] > 0:
                pstats["passAccuracy"] = f"{round(pstats['passesCompleted'] / pstats['passesAttempted'] * 100)}%"

            role = "GK" if is_gk else ("CB" if position == "Defender" else ("CM" if position == "Midfielder" else "FW"))
            if not is_starter: role = "SUB"

            p_obj = {
                "id": pid,
                "name": pname,
                "number": shirt or 0,
                "team": pteam,
                "position": position,
                "role": role,
                "rating": fm_rating,
                "predictedRating": pred_rating,
                "isStarter": is_starter,
                "stats": pstats
            }
            if pitch_x is not None and pitch_y is not None:
                p_obj["pitchX"] = pitch_x
                p_obj["pitchY"] = pitch_y

            players.append(p_obj)

        home_info = get_team_info(home_team_name)
        away_info = get_team_info(away_team_name)
        home_info["score"] = home_score
        away_info["score"] = away_score

        winner = winner_raw
        if not winner or winner.lower() == 'tie':
            if home_score > away_score: winner = home_team_name
            elif away_score > home_score: winner = away_team_name
            else: winner = "Tie"

        match_item = {
            "matchId": str(mid),
            "roundCode": round_code,
            "roundTitle": round_display,
            "status": "Finished",
            "date": "2026-07-19",
            "venue": "MetLife Stadium, New York",
            "winner": winner,
            "teams": {
                "home": home_info,
                "away": away_info
            },
            "matchStats": match_stats_dict,
            "timeline": timeline,
            "players": players
        }

        matches_out[str(mid)] = match_item

    # Build Knockout tree structure
    rounds_tree = {
        "1/16": [],
        "1/8": [],
        "1/4": [],
        "1/2": [],
        "bronze": [],
        "final": []
    }

    for mid, m in matches_out.items():
        rcode = m["roundCode"]
        if rcode in rounds_tree:
            rounds_tree[rcode].append({
                "matchId": mid,
                "homeTeam": m["teams"]["home"]["name"],
                "homeFlag": m["teams"]["home"]["flag"],
                "homeScore": m["teams"]["home"]["score"],
                "awayTeam": m["teams"]["away"]["name"],
                "awayFlag": m["teams"]["away"]["flag"],
                "awayScore": m["teams"]["away"]["score"],
                "winner": m["winner"]
            })

    output_data = {
        "knockoutTree": rounds_tree,
        "matches": matches_out
    }

    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    print(f"Successfully generated {OUT_PATH} with {len(matches_out)} matches!")

if __name__ == "__main__":
    build_dataset()
