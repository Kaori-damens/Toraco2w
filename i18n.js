// ============================================================
// i18n.js — TORACO Localization File
// ============================================================
// Cách dùng:  t('key')  →  trả về chuỗi theo ngôn ngữ hiện tại
// Đổi ngôn ngữ:  setLang('vi')  hoặc  setLang('en')
//
// ĐỂ EDIT TRANSLATIONS:
//   - Tìm section bằng Ctrl+F với tên section (VD: "== CHARGEN ==")
//   - Chỉ sửa phần values trong LANG.vi (hoặc LANG.en nếu cần)
//   - KHÔNG đổi tên keys — keys được dùng trong code
// ============================================================

let _currentLang = localStorage.getItem('toraco_lang') || 'en';

// Sync button label on page load
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('lang-toggle-btn');
  if (btn) btn.textContent = _currentLang === 'en' ? '🌐 VI' : '🌐 EN';
});

/** Lấy string theo key. Fallback về EN nếu VI chưa có. */
function t(key) {
  return (LANG[_currentLang]?.[key]) ?? (LANG.en?.[key]) ?? key;
}

/** Đổi ngôn ngữ và re-render UI hiện tại */
function setLang(lang) {
  if (lang !== 'en' && lang !== 'vi') return;
  _currentLang = lang;
  localStorage.setItem('toraco_lang', lang);
  // Update toggle button label
  const btn = document.getElementById('lang-toggle-btn');
  if (btn) btn.textContent = lang === 'en' ? '🌐 VI' : '🌐 EN';
  // Re-render current screen if a global refresh function is available
  if (typeof applyI18nStatic === 'function') applyI18nStatic();
}

// ============================================================
// TRANSLATIONS
// ============================================================
const LANG = {

  // ==========================================================
  // ENGLISH
  // ==========================================================
  en: {

    // ── GENERAL / SHARED ──────────────────────────────────────
    btn_close:            'Close',
    btn_back:             '← Back',
    btn_cancel:           'Cancel',
    btn_confirm:          'Confirm',
    btn_select_all:       'Select All',
    btn_clear:            'Clear',
    btn_menu:             '← Menu',
    btn_main_menu:        '← Main Menu',
    btn_fight:            '⚔️ FIGHT!',
    btn_fight_tooltip:    'Add at least 2 fighters to start',
    label_filter:         'Filter',
    label_or:             'or',
    no_saved_tournament:  'No saved tournament found.',
    no_saved_championship:'No saved championship found.',

    // Game title/subtitle
    game_subtitle:             'Inspired by Wheel of Multiverse and Weapon Ball Battles',

    // Tab labels
    tab_showcase:         'Showcase',
    tab_radosers:         'Radosers',
    tab_battle:           'Battle',
    tab_wiki:             'Wiki',
    tab_changelog:        'Changelogs',
    tab_analytics:        'Analytics',

    // ── BATTLE TAB CARDS (extra keys not covered below) ───────
    battle_card_quick_match:   'Quick Match',
    tournament_card_title:     'Tournament',

    // ── CHARGEN ───────────────────────────────────────────────
    chargen_header:               'RADOSERS CREATION',
    chargen_name_placeholder:     'Enter name...',
    chargen_btn_random_name:      '🎲',
    chargen_btn_next:             'Next →',
    chargen_btn_back:             '← Back',
    chargen_spin_btn:             'SPIN!',
    chargen_btn_next_skill:       'Next Skill →',
    chargen_btn_done:             'Done ✓',
    chargen_choose_race:          'Define your bloodline...',
    chargen_has_weapon_title:     'Your Steel',
    chargen_armed_label:          'Armed',
    chargen_unarmed_label:        'Unarmed',
    chargen_unique_weapon_title:  'Is it Soulbound?',
    chargen_unique_weapon_yes:    '✨ Soulbound Weapon!',
    chargen_unique_weapon_no:     'Normal Weapon',
    chargen_weapon_title:         'Weapon',
    chargen_unique_weapon_heading:'✨ Soulbound Weapon',
    chargen_step1_label:          'Step 1 — Enter Character Name',
    chargen_skill_count_label:    'Claim your skills',
    chargen_skill_of_total:       '🌀 Skill {n} of {total}',
    chargen_0_skills:             'No skills',
    chargen_done_banner:          'Radoser ready!!',
    chargen_btn_restart:          '↺ Restart',
    chargen_btn_add_draft:        '⚔️ Add to Draft',
    chargen_btn_add_roster:       '📜 Add to Radosers',
    chargen_subrace_title:        '👑 Race Skill',
    chargen_spin_to_reveal:       '— Spin to reveal —',
    chargen_fists_label:          'Fists (Unarmed)',
    chargen_unique_badge:         '★SOULBOUND',
    chargen_pending_value:        '—',
    chargen_stats_section:        'Stats',
    chargen_weapon_section:       'Weapon',
    chargen_skills_section:       '✦ Skills',
    chargen_subrace_section:      '⬡ Sub-Race',
    chargen_armed_trait_auto:     'Blessed by Athena — Weapon Mastery: always armed',
    chargen_skill_mastery_label:  'Skill Mastery',

    // Chargen — Debug modal
    debug_none_subrace:   '— None —',
    debug_random_subrace: '— Random —',
    debug_unique_badge:   'UNIQUE',
    debug_forbidden_badge:'FORBIDDEN',

    // Quick Create modal
    qc_title:         '⚡ Quick Create — Name your Radoser',
    qc_placeholder:   'Leave blank for random name…',
    qc_btn_create:    '⚡ Create!',
    qc_btn_cancel:    'Cancel',

    // Stat labels (short — stay EN in both languages)
    stat_str: 'STR', stat_spd: 'SPD', stat_dur: 'DUR',
    stat_iq:  'IQ',  stat_biq: 'BIQ', stat_ma:  'MA',
    // Stat labels (full)
    stat_full_strength:   'Strength',
    stat_full_speed:      'Speed',
    stat_full_durability: 'Durability',
    stat_full_iq:         'Intelligence',
    stat_full_battleiq:   'Battle IQ',
    stat_full_ma:         'Martial Arts',

    // ── ROSTER ────────────────────────────────────────────────
    roster_empty:               'No characters yet — create one above!',
    roster_no_match:            'No Radosers match this filter.',
    roster_btn_quick_create:    '⚡ Quick Create',
    roster_btn_create_char:     '⚗️ Create Character',
    roster_btn_debug_radoser:   '🐛 Debug Radoser',
    roster_btn_export:          '📤 Export',
    roster_btn_import:          '📥 Import',
    roster_btn_bulk_create:     '🏭 Bulk Create',
    roster_search_placeholder:  'Name, or: race=orc, str>5, weapon=bow…',
    roster_filter_label_race:   'Race',
    roster_filter_label_weapon: 'Weapon',
    roster_filter_chip_all:     'All',
    roster_total_stats_label:   'Total Stats',
    roster_btn_stats:           '📊 Stats',
    roster_btn_add_arena:       '➕ Add to Arena',
    roster_max_fighters:        'Max 12 fighters!',
    roster_base_stats_label:    'Base Stats',
    roster_combat_stats_label:  'Combat Stats',
    roster_no_skills:           'No skills',
    roster_skills_label:        '✦ Skills',
    roster_no_radosers_export:  'No Radosers to export!',
    roster_search_hint_title:   'Query syntax:',
    roster_search_hint_fields:  'str · spd · dur · iq · biq · ma · total · race · weapon · subrace · skill',

    // Stats modal (showCharStats)
    smo_weapon_label:   'Weapon:',
    smo_max_hp:         'Max HP',
    smo_launch_speed:   'Launch Speed',
    smo_base_damage:    'Base Damage',
    smo_crit_rate:      'Crit Rate',
    smo_crit_damage:    'Crit Damage',
    smo_evade_chance:   'Evade Chance',
    smo_attack_speed:   'Attack Speed',

    // Import modal
    import_title:               '📥 Import Radosers',
    import_choose_file:         '📂 Choose JSON file…',
    import_btn_merge:           '➕ Merge',
    import_merge_hint:          'add to existing',
    import_btn_replace:         '🔄 Replace',
    import_replace_hint:        'clear & import',
    import_error_no_radosers:   'No radosers found in file.',
    import_error_invalid:       'Invalid entry: missing name or stats.',

    // Bulk Create modal
    bulk_title:       '🏭 Bulk Create Radosers',
    bulk_count_label: 'Count',
    bulk_count_max:   'max 128',
    bulk_btn_cancel:  'Cancel',
    bulk_btn_create:  '⚡ Create',
    bulk_creating:    '⏳ Creating…',
    bulk_more:        '⚡ Create more',

    // Radoser title badges
    title_goat:        'GOAT',
    title_legend:      'Legend',
    title_demigod:     'Demigod',
    title_prodigy:     'Prodigy',
    title_speedster:   'Speedster',
    title_destroyer:   'Destroyer',
    title_iron_wall:   'Iron Wall',
    title_mastermind:  'Mastermind',
    title_phantom:     'Phantom',
    title_whirlwind:   'Whirlwind',
    title_tank:        'Tank',
    title_glass_cannon:'Glass Cannon',
    title_berserker:   'Berserker',
    title_trickster:   'Trickster',
    title_tactician:   'Tactician',
    title_dancer:      'Dancer',
    title_all_rounder: 'All-Rounder',
    title_balanced:    'Balanced',
    title_one_trick:   'One-Trick',
    title_veteran:     'Veteran',
    title_warrior:     'Warrior',
    title_average:     'Average',
    title_mid:         'Mid',
    title_rookie:      'Rookie',

    // Fighter picker
    fpm_your_radosers: 'Your Radosers',
    fpm_empty:         'No Radosers yet — create some in the Radosers tab!',
    fpm_add_bot:       'Add Random Bot',
    fpm_add_tag:       'ADD',

    // ── BATTLE / HUD ──────────────────────────────────────────
    arena_label:        'Arena:',
    arena_trap_label:   '⚠ Trap',
    arena_hole_label:   '⊘ Hole',
    arena_custom_btn:   '⚙️ Custom',
    hud_pause:          '⏸ Pause',
    hud_resume:         '▶ Resume',
    hud_gravity_on:     'Gravity: On',
    hud_gravity_off:    'Gravity: Off',
    hud_stop_auto:      '⏹ Stop Auto',
    hud_overtime:       'OVERTIME',
    hud_battle_log:     'Battle Log',

    // Arena builder modal
    ab_square_label:  'Size',
    ab_square_note:   'Width = Height — equal sides',
    ab_circle_label:  'Radius',
    ab_circle_note:   'Diameter = radius × 2',
    ab_rect_width:    'Width',
    ab_rect_height:   'Height',
    ab_cross_arm:     'Arm Length',
    ab_cross_note:    'Total span = arm × 2',
    ab_cross_thick:   'Arm Width',
    ab_hole_size:     'Arena Size',
    ab_hole_r:        'Hole Radius',
    ab_hole_note:     'Void in the center — bounce outward',

    // In-battle speech / announcements
    speech_bad_start:   'Bad Start',
    speech_great_start: 'Great Start!',

    // ── PVP REWARD WHEEL ──────────────────────────────────────
    pvp_reward_title:       'Victory Reward',
    pvp_spin_btn:           'SPIN!',
    pvp_accept_continue:    '✓ Accept & Continue',
    pvp_default_winner:     'Winner',
    pvp_winner_wins:        'wins!',
    pvp_leviathan_block:    "Leviathan's Envy — Stat reward ignored",
    pvp_belphegor_block:    "Belphegor's Sloth — Skill reward ignored",
    wheel_spinning:         '🎡 Spinning…',
    btn_continue:           '✓ Continue',

    // ── COPYCAT WHEEL ─────────────────────────────────────────
    cc_title:               '🎭 Copycat',
    cc_spin_btn:            '🎭 SPIN!',
    cc_label:               'Copycat',

    // ── ANGEL BLESSING ────────────────────────────────────────
    ab_title:               '⚡ Divine Favor',
    ab_desc:                'Lowest stat · Received before PvP reward',

    // ── ELEMENTAL WHEEL ───────────────────────────────────────
    ew_title:               '🌌 Elemental Blessing',
    ew_spin_btn:            'SPIN!',
    ew_spinning:            'Spinning…',
    ew_label:               'Elemental Blessing!',
    ew_default_name:        'Primordial',
    ew_result_air:          '+1 {stat} (lowest stat)',
    ew_result_water:        '+1 {stat} (highest stat)',
    ew_result_fire:         '+1 Skill: {skill}',
    ew_result_fire_empty:   'No skills left in pool',
    ew_result_fire_choose:  '🔥 Spin the Skill Wheel to choose!',
    ew_result_earth:        '+1 DUR, +1 STR',

    // ── RESULT SCREEN ─────────────────────────────────────────
    result_draw:            '🤝 DRAW!',
    result_hits:            'Hits',
    result_parries:         'Parries',
    result_damage:          'Damage',
    result_scaling:         'Scaling',
    result_duration:        'Duration',
    result_btn_rematch:     'Rematch',
    result_btn_next_game:   '▶ Next Game',
    result_btn_view_bracket:'🏆 View Bracket',
    result_btn_battle_log:  '📋 Battle Log',
    result_btn_stats:       '📊 Stats',
    result_btn_menu:        '← Menu',
    result_final_results:   '🏆 Final Results',
    result_match_stats:     '📊 Match Stats',
    result_battle_log_title:'📋 Battle Log',

    // Stats chart tabs
    chart_speed:  'Speed',
    chart_spin:   'Spin Speed',
    chart_dmg:    'Damage / s',
    chart_scale:  'Scale',

    // Skill / fighter card labels
    skill_type_passive:    'Passive',
    skill_type_pre_combat: 'Pre-Combat',
    skill_type_in_combat:  'In-Combat',
    skill_type_post_combat:'Post-Combat',
    skill_lost_tag:        'lost',
    fighter_card_no_skills:'No skills',
    fighter_card_skills_label: '✦ Skills',
    fighter_card_team:     'Team',
    bracket_tbd:           'TBD',

    // ── TOURNAMENT ────────────────────────────────────────────
    tournament_title:           '🏆 Tournament',
    tournament_card_desc:       'Single-elimination bracket. Compete with up to 64 Radosers across BO1, BO3, or BO5 matches.',
    tournament_btn_enter:       '🏆 Enter Tournament',
    tournament_btn_resume:      '▶ Resume Tournament',
    tournament_section_mode:    'Mode',
    tournament_section_size:    'Tournament Size',
    tournament_section_format:  'Match Format',
    tournament_section_select:  'Select Radosers',
    tournament_section_lineup:  'Lineup Preview',
    tournament_btn_start:       '🏆 Start Tournament',
    tournament_empty_roster:    'No Radosers yet — create some first!',
    tournament_complete:        '🏆 Tournament Complete!',
    tournament_champion_label:  'Champion',
    tournament_2v2_champion_label: 'Champions',
    tournament_2v2_complete:    '🏆 2v2 Tournament Complete!',
    tournament_round_1:         'Round 1',
    tournament_round_2:         'Round 2',
    tournament_quarter_finals:  'Quarter-Finals',
    tournament_semi_finals:     'Semi-Finals',
    tournament_final:           'Final',
    tournament_btn_over:        '🏆 Tournament Over',

    // Bracket screen
    bracket_title_default:      '🏆 Tournament Bracket',
    bracket_btn_prev:           '◀ Prev',
    bracket_btn_next:           'Next ▶',
    bracket_btn_fight_next:     '⚔️ Fight Next Match',
    bracket_btn_stats:          '📊 Stats',
    bracket_btn_main_menu:      '← Main Menu',
    bracket_de_waiting:         '⏳ Waiting for previous phase to complete…',
    bracket_ub_label:           '⬆ Winners Bracket',
    bracket_lb_label:           '⬇ Losers Bracket',
    bracket_gf_label:           '🏆 Grand Final',

    // ── CHAMPIONSHIP ──────────────────────────────────────────
    champ_card_title:       'Toraco Championship',
    champ_card_desc:        '128 or 256-player mega tournament. Battle Royale → Last Stand → Double Elimination. BO3 Grand Finals.',
    champ_btn_enter:        '🏆 Enter Championship',
    champ_btn_resume:       '▶ Resume Championship',
    champ_setup_title:      '🏆 Toraco Championship',
    champ_section_size:     'Size',
    champ_section_lineup:   'Lineup Preview',
    champ_btn_start:        '🏆 Start Championship',
    champ_draft_empty:      'No players yet — start creating!',
    champ_draft_full:       'Draft complete! {n} players ready.',
    champ_btn_create_player:'⚗️ Create Player',
    champ_btn_quick_create: '⚡ Quick Create',
    champ_no_radosers:      'No Radosers yet — create some first!',
    champ_tag_form_title:   '⚔️ Name Your Championship',
    champ_tag_name_label:   'Championship Name',
    champ_tag_name_hint:    '(1–16 chars)',
    champ_tag_label:        'Tag',
    champ_tag_hint:         '(exactly 3 chars, like Discord)',
    champ_tag_placeholder_name: 'e.g. Sunohana',
    champ_tag_placeholder_tag:  'SHN',
    champ_tag_btn_set:      '✓ Set & Continue →',
    champ_tag_error_empty_name: 'Championship name cannot be empty.',
    champ_tag_error_tag_length: 'Tag must be exactly 3 characters.',
    champ_champion_label:   'Toraco Champion',
    champ_over_btn:         '🏆 Championship Over',
    champ_fight_grand_final:'🏆 Fight Grand Final',
    champ_auto_btn:         '⚡ Auto',
    champ_stop_auto_btn:    '⏹ Stop Auto',
    champ_lock_warning:     '🔒 Size locked — {n} player(s) already in draft',
    champ_unique_pool:      '★ Unique pool: {remaining} / {total} available',
    champ_demon_pool:       '😈 Demon sins: {n} / {total} available',
    champ_demon_pool_empty: '— sinless only',
    champ_empty_slots:      'Empty slot',

    // Championship phase labels
    phase_battle_royale:    'Phase 1 — Battle Royale',
    phase_last_stand:       'Phase 1 — Last Stand BO1',
    phase_playoff_bo3:      'Phase 2 — Playoff BO3',
    phase_double_elim:      'Phase 3 — Double Elimination BO3',

    // ── PVE ───────────────────────────────────────────────────
    pve_card_title:           'Boss Raid',
    pve_card_under_construction: '(Under construction)',
    pve_card_desc:            'Team up with 1–8 Radosers to take down powerful bosses. Break body parts, avoid deadly attacks, and survive the onslaught.',
    pve_label_boss:           'Boss',
    pve_label_map:            'Map',
    pve_btn_select_party:     '⚡ Select Party',
    pve_btn_hide_roster:      '▲ Hide Roster',
    pve_btn_raid:             '⚡ RAID!',
    pve_empty:                'No Radosers yet — create some first!',
    pve_result_victory:       '⚡ VICTORY!',
    pve_result_defeated:      '💀 DEFEATED',
    pve_stat_time:            '🕐 Time',
    pve_stat_survivors:       '👥 Survivors',
    pve_stat_total_damage:    '💥 Total Damage',
    pve_table_fighter:        'Fighter',
    pve_table_damage:         'Damage',
    pve_table_status:         'Status',
    pve_status_alive:         'Alive',
    pve_status_fallen:        'Fallen',
    pve_rating_flawless:      'Flawless',
    pve_rating_excellent:     'Excellent',
    pve_rating_good:          'Good',
    pve_rating_clear:         'Clear',
    pve_rating_barely:        'Barely',
    pve_rating_defeated:      'Defeated',

    // ── WIKI ──────────────────────────────────────────────────
    wiki_stats_section:       '📊 Stats & Formulas',
    wiki_combat_section:      '⚔️ Combat Mechanics',
    wiki_races_section:       '🏷️ Races',
    wiki_weapons_section:     '🗡️ Weapons',
    wiki_unique_weapons_section: '★ Unique Weapons',
    wiki_race_skills_section: '⚡ Race Skills',
    wiki_badges_section:      '🏷️ Radoser Badges',
    wiki_skills_section:      '🔮 Skills',
    wiki_table_stat:          'Stat',
    wiki_table_short:         'Short',
    wiki_table_effect:        'Effect',
    wiki_table_formula:       'Formula',
    wiki_table_hit_type:      'Hit type',
    wiki_table_default:       'Default',
    wiki_phase_normal:        'Normal',
    wiki_phase_speed_floor:   'Speed Floor',
    wiki_phase_rage:          'Rage Mode',
    wiki_rarity_common:       'Common',
    wiki_rarity_uncommon:     'Uncommon',
    wiki_rarity_rare:         'Rare',
    wiki_rarity_epic:         'Epic',
    wiki_rarity_legendary:    'Legendary',
    wiki_table_weapon:        'Weapon',
    wiki_table_base_dmg:      'Base Dmg',
    wiki_table_cd:            'Cooldown',
    wiki_table_scaling:       'Scaling (per hit)',
    wiki_table_unique_mechanic:'Unique Mechanic',
    wiki_table_tier:          'Tier',
    wiki_table_badge:         'Badge',
    wiki_table_condition:     'Condition',

    // ── ANALYTICS ─────────────────────────────────────────────
    analytics_subtab_stats:    '📊 Match Stats',
    analytics_subtab_sim:      '⚡ Simulation',
    analytics_subtab_heuristic:'📋 Heuristic',

    // ── SKILLS ────────────────────────────────────────────────
    // Passive skills
    skill_iron_body:           'Iron Body',
    skill_thick_hide:          'Thick Hide',
    skill_swift:               'Swift',
    skill_sharp_eye:           'Sharp Eye',
    skill_extended_immunity:   'Extended Immunity',
    skill_heavy_mass:          'Heavy Mass',
    // Pre-combat skills
    skill_war_cry:             'War Cry',
    skill_fortify:             'Fortify',
    skill_adrenaline:          'Adrenaline',
    skill_predator:            'Predator',
    skill_first_blood:         'First Blood',
    skill_usurp:               'Usurp',
    skill_shadow_clone:        'Shadow Clone',
    skill_disarm:              'Disarm',
    skill_volley:              'Volley',
    skill_war_banner:          'War Banner',
    skill_necromancer_pact:    'Necromancer\'s Pact',
    skill_mirror_clone:        'Mirror Clone',
    skill_op_neko:             'Neko Neko no Mi',
    // In-combat skills
    skill_berserker:           'Berserker',
    skill_phoenix:             'Phoenix',
    skill_counter:             'Counter',
    skill_vampiric:            'Vampiric',
    skill_parry_tech_1:        'Parry Technique I',
    skill_parry_tech_2:        'Parry Technique II',
    skill_parry_tech_3:        'Parry Technique III',
    skill_momentum:            'Momentum',
    skill_shadow_step:         'Shadow Step',
    skill_blood_frenzy:        'Blood Frenzy',
    skill_flow_state:          'Flow State',
    skill_read_react:          'Read & React',
    skill_exploit:             'Exploit',
    skill_deflection:          'Deflection',
    skill_iron_knuckles:       'Iron Knuckles',
    skill_brawler_rhythm:      'Brawler\'s Rhythm',
    skill_combo_breaker:       'Combo Breaker',
    skill_rage_fists:          'Rage Fists',
    skill_guard_stance:        'Guard Stance',
    skill_duel_instinct:       'Duel Instinct',
    skill_parry_punish:        'Parry Punish',
    skill_poison_blade:        'Poison Blade',
    skill_flurry_finisher:     'Flurry Finisher',
    skill_shadow_strike:       'Shadow Strike',
    skill_long_reach:          'Long Reach',
    skill_skewer:              'Skewer',
    skill_zone_control:        'Zone Control',
    skill_reapers_mark:        'Reaper\'s Mark',
    skill_soul_harvest:        'Soul Harvest',
    skill_grim_presence:       'Grim Presence',
    skill_seismic_slam:        'Seismic Slam',
    skill_heavy_momentum:      'Heavy Momentum',
    skill_ground_pound:        'Ground Pound',
    skill_sniper:              'Sniper',
    skill_piercing_shot:       'Piercing Shot',
    skill_bounce_damage:       'Bounce Damage',
    skill_ricochet_kill:       'Ricochet Kill',
    skill_fan_throw:           'Fan Throw',
    skill_soul_puppet:         'Soul Puppet',
    skill_bone_wall:           'Bone Wall',
    skill_spirit_echo:         'Spirit Echo',
    skill_horde_call:          'Horde Call',
    skill_plague_bearer:       'Plague Bearer',
    // Post-combat skills
    skill_learning:            'Learning',
    skill_adaptation:          'Adaptation',
    skill_survivor:            'Survivor',
    skill_veteran:             'Veteran',
    skill_mastery:             'Mastery',
    skill_perfectionist:       'Perfectionist',
    skill_blood_mark:          'Blood Mark',
    skill_copycat:             'Copycat',
    skill_mind_break:          'Mind Break',
    // JJK Domains
    skill_jjk_domain_malevolent:   'Malevolent Shrine',
    skill_jjk_domain_unlimited:    'Unlimited Void',
    skill_jjk_domain_chimera:      'Chimera Shadow Garden',
    // JJK Curse Techniques
    skill_jjk_ct_command:      'Cursed Command',
    skill_jjk_ct_blackflash:   'Black Flash',
    skill_jjk_ct_swap:         'Swap',
    skill_jjk_ct_blood:        'Blood Technique',
    // JoJo Stands
    skill_jojo_stand_star:     'Star Platinum',
    skill_jojo_stand_world:    'The World',
    skill_jojo_stand_kq:       'Killer Queen',
    skill_jojo_stand_ge:       'Gold Experience',
    // JoJo Support
    skill_jojo_support_remote:    'Remote Control',
    skill_jojo_support_senses:    'Shared Senses',
    skill_jojo_support_evolution: 'Evolution',
    // One Piece Haki
    skill_op_haki_obs:         'Observation Haki',
    skill_op_haki_arm:         'Armament Haki',
    skill_op_haki_conq:        'Conqueror\'s Haki',
    // One Piece Devil Fruits
    skill_op_fruit_goro:       'Goro Goro no Mi',
    skill_op_fruit_tori:       'Tori Tori no Mi',
    skill_op_fruit_mera:       'Mera Mera no Mi',
    skill_op_fruit_ryu:        'Ryu Ryu no Mi',
    skill_op_fruit_hito:       'Hito Hito no Mi',
    skill_op_fruit_neko:       'Neko Neko no Mi',
    skill_op_fruit_pika:       'Pika Pika no Mi',

    // ── UI HARDCODED STRINGS ──────────────────────────────────
    ui_fighters_label:         'Fighters',
    ui_gravity:                'Gravity',
    ui_on:                     'On',
    ui_off:                    'Off',
    ui_your_radosers:          'Your Radosers',
    ui_general:                'General',
    ui_label:                  'Label',
    ui_opacity:                'Opacity',
    ui_ellipse:                'Ellipse',
    ui_vertices:               'Vertices',
    ui_fill:                   'Fill',
    ui_no_fill:                'No Fill',
    ui_stroke:                 'Stroke',
    ui_no_stroke:              'No Stroke',
    ui_width:                  'Width',
    ui_click_to_add:           'Click to add vertices • Double-click to finish',
    ui_modal_close:            'Close',
    ui_chart_speed:            'Speed',
    ui_chart_spin:             'Spin Speed',
    ui_chart_dmg:              'Damage / s',
    ui_chart_scale:            'Scale',
    ui_battle_log:             'Battle Log',
  },

  // ==========================================================
  // TIẾNG VIỆT
  // ==========================================================
  vi: {

    // ── CHUNG / SHARED ────────────────────────────────────────
    btn_close:            'Đóng',
    btn_back:             '← Quay lại',
    btn_cancel:           'Huỷ',
    btn_confirm:          'Xác nhận',
    btn_select_all:       'Chọn tất cả',
    btn_clear:            'Xoá chọn',
    btn_menu:             '← Menu',
    btn_main_menu:        '← Menu chính',
    btn_fight:            '⚔️ CHIẾN!',
    btn_fight_tooltip:    'Cần ít nhất 2 chiến binh để bắt đầu',
    label_filter:         'Lọc',
    label_or:             'hoặc',
    no_saved_tournament:  'Không tìm thấy giải đấu đã lưu.',
    no_saved_championship:'Không tìm thấy championship đã lưu.',

    // Game title/subtitle
    game_subtitle:        'Lấy cảm hứng từ Wheel of Multiverse và Weapon Ball Battles',

    // Tab labels
    tab_showcase:         'Trưng bày',
    tab_radosers:         'Radosers',
    tab_battle:           'Chiến đấu',
    tab_wiki:             '📖 Wiki',
    tab_changelog:        'Cập nhật',
    tab_analytics:        '📊 Thống kê',

    // ── BATTLE TAB CARDS (extra keys) ─────────────────────────
    battle_card_quick_match:   'Đấu Nhanh',
    tournament_card_title:     'Giải Đấu',

    // ── CHARGEN ───────────────────────────────────────────────
    chargen_header:               '⚗️ TẠO NHÂN VẬT',
    chargen_name_placeholder:     'Nhập tên...',
    chargen_btn_random_name:      '🎲',
    chargen_btn_next:             'Tiếp →',
    chargen_btn_back:             '← Quay lại',
    chargen_spin_btn:             '🎰 QUAY!',
    chargen_btn_next_skill:       'Skill tiếp →',
    chargen_btn_done:             'Xong ✓',
    chargen_choose_race:          'Chọn Tộc',
    chargen_has_weapon_title:     '🎰 Có Vũ Khí?',
    chargen_armed_label:          '⚔️ Có Vũ Khí',
    chargen_unarmed_label:        '✊ Không Vũ Khí',
    chargen_unique_weapon_title:  '🎰 Vũ Khí Độc Nhất?',
    chargen_unique_weapon_yes:    '✨ Vũ Khí Độc Nhất!',
    chargen_unique_weapon_no:     '⚔️ Vũ Khí Thường',
    chargen_weapon_title:         '🗡️ Vũ Khí',
    chargen_unique_weapon_heading:'✨ Vũ Khí Độc Nhất',
    chargen_skill_count_label:    'Bao nhiêu Skill?',
    chargen_0_skills:             '0 Kỹ năng',
    chargen_done_banner:          'Radoser đã sẵn sàng!!',
    chargen_btn_restart:          '↺ Làm lại',
    chargen_btn_add_draft:        '⚔️ Thêm vào Draft',
    chargen_btn_add_roster:       '📜 Thêm vào Radosers',
    chargen_subrace_title:        '👑 Kỹ Năng Tộc',
    chargen_spin_to_reveal:       '— Quay để khám phá —',
    chargen_fists_label:          '👊 Nắm Đấm (Không Vũ Khí)',
    chargen_unique_badge:         '★ ĐỘC NHẤT',
    chargen_pending_value:        '—',
    chargen_stats_section:        '📊 Chỉ Số',
    chargen_weapon_section:       '⚔️ Vũ Khí',
    chargen_skills_section:       '✦ Kỹ Năng',
    chargen_subrace_section:      '⬡ Phụ Tộc',
    chargen_armed_trait_auto:     '✨ Phước lành Athena — Thuần thục Vũ khí: luôn có vũ khí',
    chargen_skill_mastery_label:  '🧠 Thuần Thục Kỹ Năng',

    // Chargen — Debug modal
    debug_none_subrace:   '— Không —',
    debug_random_subrace: '— Ngẫu nhiên —',
    debug_unique_badge:   'ĐỘC NHẤT',
    debug_forbidden_badge:'CẤM',

    // Quick Create modal
    qc_title:         '⚡ Tạo Nhanh — Đặt tên Radoser',
    qc_placeholder:   'Để trống để dùng tên ngẫu nhiên…',
    qc_btn_create:    '⚡ Tạo!',
    qc_btn_cancel:    'Huỷ',

    // Stat labels — viết tắt GIỮ TIẾNG ANH
    stat_str: 'STR', stat_spd: 'SPD', stat_dur: 'DUR',
    stat_iq:  'IQ',  stat_biq: 'BIQ', stat_ma:  'MA',
    // Stat labels (tên đầy đủ)
    stat_full_strength:   'Sức Mạnh',
    stat_full_speed:      'Tốc Độ',
    stat_full_durability: 'Độ Bền',
    stat_full_iq:         'Trí Tuệ',
    stat_full_battleiq:   'Chiến Thuật',
    stat_full_ma:         'Võ Thuật',

    // ── ROSTER ────────────────────────────────────────────────
    roster_empty:               'Chưa có nhân vật nào — tạo một ở trên!',
    roster_no_match:            'Không có Radoser nào khớp bộ lọc này.',
    roster_btn_quick_create:    '⚡ Tạo Nhanh',
    roster_btn_create_char:     '⚗️ Tạo Nhân Vật',
    roster_btn_debug_radoser:   '🐛 Debug Radoser',
    roster_btn_export:          '📤 Xuất',
    roster_btn_import:          '📥 Nhập',
    roster_btn_bulk_create:     '🏭 Tạo Hàng Loạt',
    roster_search_placeholder:  'Tên, hoặc: race=orc, str>5, weapon=bow…',
    roster_filter_label_race:   'Tộc',
    roster_filter_label_weapon: 'Vũ Khí',
    roster_filter_chip_all:     'Tất cả',
    roster_total_stats_label:   'Tổng Chỉ Số',
    roster_btn_stats:           '📊 Thống kê',
    roster_btn_add_arena:       '➕ Thêm vào Đấu Trường',
    roster_max_fighters:        'Tối đa 12 chiến binh!',
    roster_base_stats_label:    'Chỉ Số Cơ Bản',
    roster_combat_stats_label:  'Chỉ Số Chiến Đấu',
    roster_no_skills:           'Không có kỹ năng',
    roster_skills_label:        '✦ Kỹ Năng',
    roster_no_radosers_export:  'Không có Radoser nào để xuất!',
    roster_search_hint_title:   'Cú pháp tìm kiếm:',
    roster_search_hint_fields:  'str · spd · dur · iq · biq · ma · total · race · weapon · subrace · skill',

    // Stats modal
    smo_weapon_label:   'Vũ Khí:',
    smo_max_hp:         '❤️ HP Tối Đa',
    smo_launch_speed:   '🚀 Tốc Độ Phóng',
    smo_base_damage:    '⚔️ Sát Thương Cơ Bản',
    smo_crit_rate:      '⚡ Tỷ Lệ Chí Mạng',
    smo_crit_damage:    '💥 Sát Thương Chí Mạng',
    smo_evade_chance:   '🌀 Tỷ Lệ Né',
    smo_attack_speed:   '🔥 Tốc Độ Tấn Công',

    // Import modal
    import_title:               '📥 Nhập Radosers',
    import_choose_file:         '📂 Chọn file JSON…',
    import_btn_merge:           '➕ Gộp',
    import_merge_hint:          'thêm vào hiện có',
    import_btn_replace:         '🔄 Thay thế',
    import_replace_hint:        'xoá & nhập',
    import_error_no_radosers:   'Không tìm thấy radoser nào trong file.',
    import_error_invalid:       'Dữ liệu không hợp lệ: thiếu tên hoặc chỉ số.',

    // Bulk Create modal
    bulk_title:       '🏭 Tạo Hàng Loạt Radosers',
    bulk_count_label: 'Số lượng',
    bulk_count_max:   'tối đa 128',
    bulk_btn_cancel:  'Huỷ',
    bulk_btn_create:  '⚡ Tạo ngay',
    bulk_creating:    '⏳ Đang tạo…',
    bulk_more:        '⚡ Tạo thêm',

    // Radoser title badges
    title_goat:        'GOAT',
    title_legend:      'Huyền Thoại',
    title_demigod:     'Bán Thần',
    title_prodigy:     'Thần Đồng',
    title_speedster:   'Tốc Biến',
    title_destroyer:   'Hủy Diệt',
    title_iron_wall:   'Thành Sắt',
    title_mastermind:  'Đại Trí',
    title_phantom:     'Bóng Ma',
    title_whirlwind:   'Lốc Xoáy',
    title_tank:        'Xe Tăng',
    title_glass_cannon:'Pháo Thủy Tinh',
    title_berserker:   'Cuồng Chiến',
    title_trickster:   'Xảo Thuật',
    title_tactician:   'Chiến Lược Gia',
    title_dancer:      'Vũ Sĩ',
    title_all_rounder: 'Toàn Năng',
    title_balanced:    'Cân Bằng',
    title_one_trick:   'Độc Chiêu',
    title_veteran:     'Lão Luyện',
    title_warrior:     'Chiến Binh',
    title_average:     'Bình Thường',
    title_mid:         'Trung Bình',
    title_rookie:      'Tân Binh',

    // Fighter picker
    fpm_your_radosers: 'Radosers của bạn',
    fpm_empty:         'Chưa có Radoser nào — tạo một vài cái trong tab Radosers!',
    fpm_add_bot:       'Thêm Bot Ngẫu Nhiên',
    fpm_add_tag:       'THÊM',

    // ── BATTLE / HUD ──────────────────────────────────────────
    arena_label:        'Đấu Trường:',
    arena_trap_label:   '⚠ Bẫy',
    arena_hole_label:   '⊘ Hố',
    arena_custom_btn:   '⚙️ Tuỳ chỉnh',
    hud_pause:          '⏸ Tạm dừng',
    hud_resume:         '▶ Tiếp tục',
    hud_gravity_on:     '🌍 Trọng lực: Bật',
    hud_gravity_off:    '🌍 Trọng lực: Tắt',
    hud_stop_auto:      '⏹ Dừng Tự Động',
    hud_overtime:       'HIỆP PHỤ',
    hud_battle_log:     '📋 Nhật Ký Trận',

    // Arena builder modal
    ab_square_label:  'Kích thước',
    ab_square_note:   'Rộng = Cao — cạnh đều nhau',
    ab_circle_label:  'Bán kính',
    ab_circle_note:   'Đường kính = bán kính × 2',
    ab_rect_width:    'Rộng',
    ab_rect_height:   'Cao',
    ab_cross_arm:     'Chiều dài cánh',
    ab_cross_note:    'Tổng chiều = cánh × 2',
    ab_cross_thick:   'Chiều rộng cánh',
    ab_hole_size:     'Kích thước Đấu Trường',
    ab_hole_r:        'Bán kính Hố',
    ab_hole_note:     'Khoảng trống ở giữa — nảy ra ngoài',

    // In-battle speech
    speech_bad_start:   '😴 Khởi đầu tệ',
    speech_great_start: '🔥 Khởi đầu xuất sắc!',

    // ── PVP REWARD WHEEL ──────────────────────────────────────
    pvp_reward_title:       '🎁 Phần Thưởng Chiến Thắng',
    pvp_spin_btn:           '🎰 QUAY!',
    pvp_accept_continue:    '✓ Nhận & Tiếp tục',
    pvp_default_winner:     'Người thắng',
    pvp_winner_wins:        'chiến thắng!',
    pvp_leviathan_block:    '😈 Đố Kỵ Leviathan — Bỏ qua phần thưởng chỉ số',
    pvp_belphegor_block:    '😈 Lười Biếng Belphegor — Bỏ qua phần thưởng kỹ năng',
    wheel_spinning:         '🎡 Đang quay…',
    btn_continue:           '✓ Tiếp tục',

    // ── COPYCAT WHEEL ─────────────────────────────────────────
    cc_title:               '🎭 Sao Chép',
    cc_spin_btn:            '🎭 QUAY!',
    cc_label:               'Sao Chép',

    // ── ANGEL BLESSING ────────────────────────────────────────
    ab_title:               '⚡ Ân Điển Thần Thánh',
    ab_desc:                'Chỉ số thấp nhất · Nhận trước PvP reward',

    // ── ELEMENTAL WHEEL ───────────────────────────────────────
    ew_title:               '🌌 Ân Huệ Nguyên Tố',
    ew_spin_btn:            '🌀 QUAY!',
    ew_spinning:            '🌀 Đang quay…',
    ew_label:               'Ân Huệ Nguyên Tố!',
    ew_default_name:        'Nguyên Thủy',
    ew_result_air:          '+1 {stat} (chỉ số thấp nhất)',
    ew_result_water:        '+1 {stat} (chỉ số cao nhất)',
    ew_result_fire:         '+1 Kỹ Năng: {skill}',
    ew_result_fire_empty:   'Không còn kỹ năng trong pool',
    ew_result_fire_choose:  '🔥 Quay vòng Kỹ Năng để chọn!',
    ew_result_earth:        '+1 DUR, +1 STR',

    // ── RESULT SCREEN ─────────────────────────────────────────
    result_draw:            '🤝 HÒA!',
    result_duration:        'Thời lượng',
    result_hits:            'Lần đánh',
    result_parries:         'Lần đỡ',
    result_damage:          'Sát Thương',
    result_scaling:         'Độ Tăng Trưởng',
    result_btn_rematch:     '⚔️ Đấu Lại',
    result_btn_next_game:   '▶ Game Tiếp',
    result_btn_view_bracket:'🏆 Xem Bảng Đấu',
    result_btn_battle_log:  '📋 Nhật Ký Trận',
    result_btn_stats:       '📊 Thống kê',
    result_btn_menu:        '← Menu',
    result_final_results:   '🏆 Kết Quả Cuối',
    result_match_stats:     '📊 Thống kê Trận',
    result_battle_log_title:'📋 Nhật Ký Trận',

    // Stats chart tabs
    chart_speed:  'Tốc Độ',
    chart_spin:   'Tốc Độ Xoay',
    chart_dmg:    'Sát Thương / s',
    chart_scale:  'Độ Tăng',

    // Skill / fighter card labels
    skill_type_passive:    'Bị Động',
    skill_type_pre_combat: 'Trước Chiến',
    skill_type_in_combat:  'Trong Chiến',
    skill_type_post_combat:'Sau Chiến',
    skill_lost_tag:        'mất',
    fighter_card_no_skills:'Không có kỹ năng',
    fighter_card_skills_label: '✦ Kỹ Năng',
    fighter_card_team:     'Đội',
    bracket_tbd:           'Chờ xác định',

    // ── TOURNAMENT ────────────────────────────────────────────
    tournament_title:           '🏆 Giải Đấu',
    tournament_card_desc:       'Bảng đấu loại trực tiếp. Cạnh tranh với tối đa 64 Radoser qua các trận BO1, BO3 hoặc BO5.',
    tournament_btn_enter:       '🏆 Tham Gia Giải Đấu',
    tournament_btn_resume:      '▶ Tiếp Tục Giải Đấu',
    tournament_section_mode:    'Chế Độ',
    tournament_section_size:    'Số Người Tham Gia',
    tournament_section_format:  'Thể Thức',
    tournament_section_select:  'Chọn Radosers',
    tournament_section_lineup:  'Xem Trước Đội Hình',
    tournament_btn_start:       '🏆 Bắt Đầu Giải Đấu',
    tournament_empty_roster:    'Chưa có Radoser nào — tạo một vài cái trước!',
    tournament_complete:        '🏆 Giải Đấu Hoàn Thành!',
    tournament_champion_label:  'Vô Địch',
    tournament_2v2_champion_label: 'Vô Địch',
    tournament_2v2_complete:    '🏆 Giải Đấu 2v2 Hoàn Thành!',
    tournament_round_1:         'Vòng 1',
    tournament_round_2:         'Vòng 2',
    tournament_quarter_finals:  'Tứ Kết',
    tournament_semi_finals:     'Bán Kết',
    tournament_final:           'Chung Kết',
    tournament_btn_over:        '🏆 Giải Đấu Kết Thúc',

    // Bracket screen
    bracket_title_default:      '🏆 Bảng Đấu',
    bracket_btn_prev:           '◀ Trước',
    bracket_btn_next:           'Tiếp ▶',
    bracket_btn_fight_next:     '⚔️ Chiến Trận Tiếp Theo',
    bracket_btn_stats:          '📊 Thống kê',
    bracket_btn_main_menu:      '← Menu Chính',
    bracket_de_waiting:         '⏳ Chờ vòng trước kết thúc…',
    bracket_ub_label:           '⬆ Bảng Thắng',
    bracket_lb_label:           '⬇ Bảng Thua',
    bracket_gf_label:           '🏆 Chung Kết Lớn',

    // ── CHAMPIONSHIP ──────────────────────────────────────────
    champ_card_title:       'Toraco Championship',
    champ_card_desc:        'Mega giải đấu 128 hoặc 256 người. Battle Royale → Last Stand → Loại Kép. Chung kết BO3.',
    champ_btn_enter:        '🏆 Tham Gia Championship',
    champ_btn_resume:       '▶ Tiếp Tục Championship',
    champ_setup_title:      '🏆 Toraco Championship',
    champ_section_size:     'Kích Cỡ',
    champ_section_lineup:   'Xem Trước Đội Hình',
    champ_btn_start:        '🏆 Bắt Đầu Championship',
    champ_draft_empty:      'Chưa có người chơi nào — bắt đầu tạo!',
    champ_draft_full:       'Draft hoàn tất! {n} người sẵn sàng.',
    champ_btn_create_player:'⚗️ Tạo Người Chơi',
    champ_btn_quick_create: '⚡ Tạo Nhanh',
    champ_no_radosers:      'Chưa có Radoser nào — tạo một vài cái trước!',
    champ_tag_form_title:   '⚔️ Đặt Tên Championship',
    champ_tag_name_label:   'Tên Championship',
    champ_tag_name_hint:    '(1–16 ký tự)',
    champ_tag_label:        'Thẻ',
    champ_tag_hint:         '(đúng 3 ký tự, như Discord)',
    champ_tag_placeholder_name: 'vd. Sunohana',
    champ_tag_placeholder_tag:  'SHN',
    champ_tag_btn_set:      '✓ Xác nhận & Tiếp →',
    champ_tag_error_empty_name: 'Tên Championship không được để trống.',
    champ_tag_error_tag_length: 'Thẻ phải đúng 3 ký tự.',
    champ_champion_label:   'Vô Địch Toraco',
    champ_over_btn:         '🏆 Championship Kết Thúc',
    champ_fight_grand_final:'🏆 Đánh Chung Kết Lớn',
    champ_auto_btn:         '⚡ Tự Động',
    champ_stop_auto_btn:    '⏹ Dừng Tự Động',
    champ_lock_warning:     '🔒 Đã khoá kích cỡ — {n} người chơi đã trong draft',
    champ_unique_pool:      '★ Kho độc nhất: {remaining} / {total} còn lại',
    champ_demon_pool:       '😈 Tội lỗi Quỷ: {n} / {total} còn lại',
    champ_demon_pool_empty: '— chỉ còn Quỷ không tội',
    champ_empty_slots:      'Vị trí trống',

    // Championship phase labels
    phase_battle_royale:    'Vòng 1 — Battle Royale',
    phase_last_stand:       'Vòng 1 — Trụ Vững BO1',
    phase_playoff_bo3:      'Vòng 2 — Playoff BO3',
    phase_double_elim:      'Vòng 3 — Loại Kép BO3',

    // ── PVE ───────────────────────────────────────────────────
    pve_card_title:           'Boss Raid',
    pve_card_under_construction: '(Đang phát triển)',
    pve_card_desc:            'Hợp tác 1–8 Radoser để hạ gục boss mạnh. Phá hủy bộ phận cơ thể, né tấn công chí tử và sống sót.',
    pve_label_boss:           'Boss',
    pve_label_map:            'Bản Đồ',
    pve_btn_select_party:     '⚡ Chọn Đội',
    pve_btn_hide_roster:      '▲ Ẩn Danh Sách',
    pve_btn_raid:             '⚡ RAID!',
    pve_empty:                'Chưa có Radoser nào — tạo một vài cái trước!',
    pve_result_victory:       '⚡ CHIẾN THẮNG!',
    pve_result_defeated:      '💀 THẤT BẠI',
    pve_stat_time:            '🕐 Thời Gian',
    pve_stat_survivors:       '👥 Sống Sót',
    pve_stat_total_damage:    '💥 Tổng Sát Thương',
    pve_table_fighter:        'Chiến Binh',
    pve_table_damage:         'Sát Thương',
    pve_table_status:         'Tình Trạng',
    pve_status_alive:         'Còn Sống',
    pve_status_fallen:        'Đã Ngã',
    pve_rating_flawless:      'Hoàn Hảo',
    pve_rating_excellent:     'Xuất Sắc',
    pve_rating_good:          'Tốt',
    pve_rating_clear:         'Qua Ải',
    pve_rating_barely:        'Vừa Vặn',
    pve_rating_defeated:      'Thất Bại',

    // ── WIKI ──────────────────────────────────────────────────
    wiki_stats_section:       '📊 Chỉ Số & Công Thức',
    wiki_combat_section:      '⚔️ Cơ Chế Chiến Đấu',
    wiki_races_section:       '🏷️ Chủng Tộc',
    wiki_weapons_section:     '🗡️ Vũ Khí',
    wiki_unique_weapons_section: '★ Vũ Khí Độc Nhất',
    wiki_race_skills_section: '⚡ Kỹ Năng Tộc',
    wiki_badges_section:      '🏷️ Huy Hiệu Radoser',
    wiki_skills_section:      '🔮 Kỹ Năng',
    wiki_table_stat:          'Chỉ Số',
    wiki_table_short:         'Viết Tắt',
    wiki_table_effect:        'Hiệu Ứng',
    wiki_table_formula:       'Công Thức',
    wiki_table_hit_type:      'Loại Đòn',
    wiki_table_default:       'Mặc Định',
    wiki_phase_normal:        'Bình Thường',
    wiki_phase_speed_floor:   'Tốc Độ Tối Thiểu',
    wiki_phase_rage:          'Chế Độ Điên Cuồng',
    wiki_rarity_common:       'Phổ Biến',
    wiki_rarity_uncommon:     'Hiếm',
    wiki_rarity_rare:         'Quý Hiếm',
    wiki_rarity_epic:         'Sử Thi',
    wiki_rarity_legendary:    'Huyền Thoại',
    wiki_table_weapon:        'Vũ Khí',
    wiki_table_base_dmg:      'Sát Thương Cơ Bản',
    wiki_table_cd:            'Hồi Chiêu',
    wiki_table_scaling:       'Tăng Trưởng (mỗi đòn)',
    wiki_table_unique_mechanic:'Cơ Chế Đặc Biệt',
    wiki_table_tier:          'Hạng',
    wiki_table_badge:         'Huy Hiệu',
    wiki_table_condition:     'Điều Kiện',

    // ── ANALYTICS ─────────────────────────────────────────────
    analytics_subtab_stats:    '📊 Thống Kê Trận',
    analytics_subtab_sim:      '⚡ Mô Phỏng',
    analytics_subtab_heuristic:'📋 Heuristic',

    // ── SKILLS ────────────────────────────────────────────────
    // Passive skills
    skill_iron_body:           'Thân Sắt',
    skill_thick_hide:          'Da Dày',
    skill_swift:               'Nhanh Nhẹn',
    skill_sharp_eye:           'Mắt Sắc',
    skill_extended_immunity:   'Miễn Dịch Kéo Dài',
    skill_heavy_mass:          'Khối Lượng Nặng',
    // Pre-combat skills
    skill_war_cry:             'Tiếng Gầm Chiến',
    skill_fortify:             'Pháo Đài',
    skill_adrenaline:          'Adrenaline',
    skill_predator:            'Kẻ Săn Mồi',
    skill_first_blood:         'Máu Đầu Tiên',
    skill_usurp:               'Cướp Đoạt',
    skill_shadow_clone:        'Shadow Clone',
    skill_disarm:              'Cơ Động',
    skill_volley:              'Mưa Mũi Tên',
    skill_war_banner:          'Cờ Chiến',
    skill_necromancer_pact:    'Pact Thần Chết',
    skill_mirror_clone:        'Mirror Clone',
    skill_op_neko:             'Neko Neko no Mi',
    // In-combat skills
    skill_berserker:           'Cuồng Chiến',
    skill_phoenix:             'Phượng Hoàng',
    skill_counter:             'Phản Công',
    skill_vampiric:            'Ma Cà Rồng',
    skill_parry_tech_1:        'Kỹ Thuật Đỡ I',
    skill_parry_tech_2:        'Kỹ Thuật Đỡ II',
    skill_parry_tech_3:        'Kỹ Thuật Đỡ III',
    skill_momentum:            'Động Lực',
    skill_shadow_step:         'Bước Bóng Tối',
    skill_blood_frenzy:        'Cuồng Máu',
    skill_flow_state:          'Trạng Thái Lưu Chảy',
    skill_read_react:          'Đọc & Phản Ứng',
    skill_exploit:             'Khai Thác',
    skill_deflection:          'Chệch Hướng',
    skill_iron_knuckles:       'Nắm Đấm Sắt',
    skill_brawler_rhythm:      'Nhịp Đô Vật',
    skill_combo_breaker:       'Phá Combo',
    skill_rage_fists:          'Nắm Đấm Giận Dữ',
    skill_guard_stance:        'Tư Thế Phòng Thủ',
    skill_duel_instinct:       'Bản Năng Quyết Đấu',
    skill_parry_punish:        'Phạt Đỡ',
    skill_poison_blade:        'Lưỡi Kiếm Độc',
    skill_flurry_finisher:     'Kết Thúc Mưa Đòn',
    skill_shadow_strike:       'Đòn Bóng Tối',
    skill_long_reach:          'Tầm Xa Dài',
    skill_skewer:              'Xuyên Qua',
    skill_zone_control:        'Kiểm Soát Vùng',
    skill_reapers_mark:        'Dấu Thợ Gặt',
    skill_soul_harvest:        'Thu Hoạch Linh Hồn',
    skill_grim_presence:       'Sự Có Mặt Grim',
    skill_seismic_slam:        'Đấm Chấn Động',
    skill_heavy_momentum:      'Động Lực Nặng',
    skill_ground_pound:        'Đấm Đất',
    skill_sniper:              'Xạ Thủ',
    skill_piercing_shot:       'Mũi Tên Xuyên',
    skill_bounce_damage:       'Sát Thương Nảy',
    skill_ricochet_kill:       'Giết Nảy Ngược',
    skill_fan_throw:           'Ném Quạt',
    skill_soul_puppet:         '傀儡 Linh Hồn',
    skill_bone_wall:           'Bức Tường Xương',
    skill_spirit_echo:         'Âm Vang Tinh Thần',
    skill_horde_call:          'Triệu Hồi Đàn',
    skill_plague_bearer:       'Kẻ Mang Dịch',
    // Post-combat skills
    skill_learning:            'Học Hỏi',
    skill_adaptation:          'Thích Nghi',
    skill_survivor:            'Người Sống Sót',
    skill_veteran:             'Lão Luyện',
    skill_mastery:             'Thành Thạo',
    skill_perfectionist:       'Hoàn Hảo Chủ Nghĩa',
    skill_blood_mark:          'Dấu Máu',
    skill_copycat:             'Sao Chép',
    skill_mind_break:          'Phá Tâm Trí',
    // JJK Domains
    skill_jjk_domain_malevolent:   'Phục ma Ngự trù tử',
    skill_jjk_domain_unlimited:    'Vô Lượng Không Xứ',
    skill_jjk_domain_chimera:      'Khảm Hợp Ám Đình',
    // JJK Curse Techniques
    skill_jjk_ct_command:      'Chú Ngôn',
    skill_jjk_ct_blackflash:   'Kính Kình',
    skill_jjk_ct_swap:         'Bất Nghĩa Du Hí',
    skill_jjk_ct_blood:        'Xuyên Huyết',
    // JoJo Stands
    skill_jojo_stand_star:     'Star Platinum',
    skill_jojo_stand_world:    'The World',
    skill_jojo_stand_kq:       'Killer Queen',
    skill_jojo_stand_ge:       'Gold Experience',
    // JoJo Support
    skill_jojo_support_remote:    'Điều Khiển Từ Xa',
    skill_jojo_support_senses:    'Chia Sẻ Giác Quan',
    skill_jojo_support_evolution: 'Evolution',
    // One Piece Haki
    skill_op_haki_obs:         'Observation Haki',
    skill_op_haki_arm:         'Armament Haki',
    skill_op_haki_conq:        'Conqueror\'s Haki',
    // One Piece Devil Fruits
    skill_op_fruit_goro:       'Goro Goro no Mi',
    skill_op_fruit_tori:       'Tori Tori no Mi',
    skill_op_fruit_mera:       'Mera Mera no Mi',
    skill_op_fruit_ryu:        'Ryu Ryu no Mi',
    skill_op_fruit_hito:       'Hito Hito no Mi',
    skill_op_fruit_neko:       'Neko Neko no Mi',
    skill_op_fruit_pika:       'Pika Pika no Mi',

    // ── UI HARDCODED STRINGS ──────────────────────────────────
    ui_fighters_label:         'Chiến Binh',
    ui_gravity:                'Trọng Lực',
    ui_on:                     'Bật',
    ui_off:                    'Tắt',
    ui_your_radosers:          'Radosers Của Bạn',
    ui_general:                'Chung',
    ui_label:                  'Nhãn',
    ui_opacity:                'Độ Trong Suốt',
    ui_ellipse:                'Hình Elip',
    ui_vertices:               'Đỉnh',
    ui_fill:                   'Tô Đầy',
    ui_no_fill:                'Không Tô',
    ui_stroke:                 'Viền',
    ui_no_stroke:              'Không Viền',
    ui_width:                  'Rộng',
    ui_click_to_add:           'Click để thêm đỉnh • Double-click để hoàn thành',
    ui_modal_close:            'Đóng',
    ui_chart_speed:            'Tốc Độ',
    ui_chart_spin:             'Tốc Độ Xoay',
    ui_chart_dmg:              'Sát Thương / s',
    ui_chart_scale:            'Tăng Trưởng',
    ui_battle_log:             'Nhật Ký Trận',
  },
};

// ============================================================
// applyI18nStatic — Phase 2 (Cách A)
// Scans all [data-i18n] / [data-i18n-placeholder] elements and
// updates them, then re-renders any active dynamic screens.
// ============================================================
function applyI18nStatic() {
  // 1. Static text nodes
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (val !== key) el.textContent = val;
  });

  // 2. Input placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    const val = t(key);
    if (val !== key) el.placeholder = val;
  });

  // 3. Re-render dynamic screens
  _i18nRefreshScreens();
}

function _i18nRefreshScreens() {
  // Roster — always safe to re-render (no-op if empty)
  if (typeof renderRoster === 'function') renderRoster();

  // Chargen — only if the chargen screen is visible
  const cgBox = document.getElementById('cg-content');
  if (cgBox && cgBox.closest('.screen')?.classList.contains('active')) {
    if (typeof renderCgStep === 'function') renderCgStep();
  }

  // Championship setup
  const csSetup = document.getElementById('championship-setup');
  if (csSetup?.classList.contains('active')) {
    if (typeof buildChampionshipSetup === 'function') buildChampionshipSetup();
  }

  // Championship bracket
  const csBracket = document.getElementById('bracket');
  if (csBracket?.classList.contains('active') && state?.championship) {
    if (typeof renderChampionshipBracket === 'function') renderChampionshipBracket();
  }

  // Tournament bracket
  if (csBracket?.classList.contains('active') && state?.tournament) {
    if (typeof renderTournamentBracket === 'function') renderTournamentBracket();
  }

  // Fighters panel (Battle tab — always rendered when roster changes)
  if (typeof buildFightersPanel === 'function') buildFightersPanel();
}
