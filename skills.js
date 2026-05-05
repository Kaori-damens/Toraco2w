// ============================================================
// SKILL SYSTEM
// ============================================================
// ─── Tổng quan hệ thống skill ────────────────────────────────
// Mỗi skill được định nghĩa là 1 object trong mảng SKILL_DEFS.
// Các field quan trọng:
//   id       (string)  — key duy nhất, dùng để check ball.skills.includes(id)
//   name     (string)  — tên hiển thị trên UI
//   icon     (string)  — emoji hiện trên HUD
//   type     (string)  — phân loại khi nào skill kích hoạt:
//                        'passive'     → luôn luôn hiệu lực, áp dụng qua applySkillPassives()
//                        'pre_combat'  → kích hoạt 1 lần khi bắt đầu round, qua skillOnPreCombat()
//                        'in_combat'   → hook sự kiện trong trận (hit/parry/evade/kill)
//                        'post_combat' → kích hoạt sau khi round kết thúc, qua skillOnPostCombat()
//   desc     (string)  — mô tả hiển thị cho người dùng
//   unique   (bool)    — chỉ có ở Championship pool, bị lấy ra sau khi ai đó roll được
//   weapon   (string)  — nếu có, skill chỉ hoạt động khi ball đang dùng vũ khí tương ứng
const SKILL_DEFS = [
  // ── PASSIVE (always active) ──────────────────────────────
  // weight: xác suất xuất hiện trong spin wheel (cao = dễ lấy, thấp = hiếm)
  { id: 'iron_body',          name: 'Iron Body',          icon: '', weight: 1.8, type: 'passive',    desc: '+20 max HP' },
  { id: 'thick_hide',         name: 'Thick Hide',         icon: '', weight: 1.8, type: 'passive',    desc: 'Take 10% less damage from all sources' },
  { id: 'swift',              name: 'Swift',              icon: '', weight: 1.8, type: 'passive',    desc: 'Move 15% faster' },
  { id: 'sharp_eye',          name: 'Sharp Eye',          icon: '', weight: 1.8, type: 'passive',    desc: 'Critical hit chance +10%' },
  { id: 'extended_immunity',  name: 'Extended Immunity',  icon: '', weight: 1.5, type: 'passive',    desc: 'Invincibility window after being hit lasts much longer' },
  { id: 'heavy_mass',         name: 'Heavy Mass',         icon: '', weight: 1.5, type: 'passive',    desc: 'Much harder to knock back' },
  // ── PRE-COMBAT (triggers once at round start) ────────────
  { id: 'war_cry',    name: 'War Cry',    icon: '', weight: 1.8, type: 'pre_combat', desc: 'First hit of the round deals ×(1.5 + IQ×0.05) damage. [IQ=1: ×1.55 / IQ=10: ×2.0]' },
  { id: 'fortify',    name: 'Fortify',    icon: '', weight: 1.8, type: 'pre_combat', desc: 'Begin each round with a shield absorbing (10 + BIQ×2) damage. Excess passes through. [BIQ=1: 12 / BIQ=10: 30]' },
  { id: 'adrenaline', name: 'Adrenaline', icon: '', weight: 1.8, type: 'pre_combat', desc: 'Move 50% faster for the first 5 seconds of each round' },
  { id: 'predator',   name: 'Predator',   icon: '', weight: 1.8, type: 'pre_combat', desc: 'Deal 15% more damage when the enemy has less HP than you' },
  { id: 'first_blood',name: 'First Blood',icon: '', weight: 1.0, type: 'pre_combat', desc: 'First hit of the round stuns the opponent for (20 + BIQ×4) frames. [BIQ=1: 0.4s / BIQ=10: 1.0s]' },
  // ── IN-COMBAT (reactive event hooks) ────────────────────
  { id: 'berserker',   name: 'Berserker',   icon: '', weight: 1.2, type: 'in_combat',  desc: 'Below 30% HP: deal ×(1.2 + IQ×0.03) damage. [IQ=1: ×1.23 / IQ=10: ×1.5]' },
  { id: 'phoenix',     name: 'Phoenix',     icon: '', weight: 0.6, type: 'in_combat',  desc: 'Once per round, survive a killing blow with 1 HP remaining' },
  { id: 'counter',     name: 'Counter',     icon: '', weight: 1.2, type: 'in_combat',  desc: 'After your attack is parried, next hit deals ×(1.5 + BIQ×0.05) damage. [BIQ=1: ×1.55 / BIQ=10: ×2.0]' },
  { id: 'vampiric',    name: 'Vampiric',    icon: '', weight: 1.2, type: 'in_combat',  desc: 'Each hit heals you for 5% of the damage you deal' },
  { id: 'parry_tech_1', name: 'Parry Technique I',   icon: '', weight: 1.5, type: 'in_combat',  desc: 'On parry: instantly reverse weapon spin. Each reverse stacks +5% spin speed (max 3 stacks = +15%).' },
  { id: 'parry_tech_2', name: 'Parry Technique II',  icon: '', weight: 1.0, type: 'in_combat',  desc: 'On parry: no knockback + spin boost (60+BIQ×6 frames) + counter window (BIQ×4 frames). [BIQ=5: 90f spin / 20f counter | BIQ=10: 120f spin / 40f counter]' },
  { id: 'parry_tech_3', name: 'Parry Technique III', icon: '', weight: 0.8, type: 'passive',    desc: 'Your entire weapon body can parry (not just the tip). Fists users: take 50% damage on parry clashes.' },
  { id: 'momentum',    name: 'Momentum',    icon: '', weight: 1.2, type: 'in_combat',  desc: 'Each kill in FFA increases your speed by 10%, up to 5 kills' },
  { id: 'shadow_step', name: 'Shadow Step', icon: '', weight: 0.7, type: 'in_combat',  desc: 'When you dodge a hit, instantly teleport to a random safe position' },
  { id: 'blood_frenzy',name: 'Blood Frenzy',icon: '', weight: 1.2, type: 'in_combat',  desc: 'Restore 25 HP each time you defeat an opponent' },
  { id: 'flow_state',  name: 'Flow State',  icon: '', weight: 1.2, type: 'in_combat',  desc: 'Each hit builds speed (+MA×1% per stack). Taking damage resets all stacks' },
  { id: 'read_react',  name: 'Read & React',icon: '', weight: 1.2, type: 'in_combat',  desc: 'When hit, BIQ×3.5% chance to counter for ×(1 + BIQ×0.1) damage. [BIQ=5: 17.5% / ×1.5 / BIQ=10: 35% / ×2.0]' },
  { id: 'exploit',     name: 'Exploit',     icon: '', weight: 1.2, type: 'in_combat',  desc: 'Each hit: (IQ+BIQ)×1% chance to deal ×(1.5 + IQ×0.05) damage. [IQ+BIQ=10: 10% / IQ=10: ×2.0]' },
  { id: 'deflection',  name: 'Deflection',  icon: '', weight: 0.8, type: 'passive',    desc: 'MA×2% chance to completely negate an incoming hit. [MA=5: 10% / MA=10: 20%]' },
  { id: 'mind_break',  name: 'Mind Break',  icon: '', weight: 1.0, type: 'pre_combat', desc: 'If IQ > enemy IQ: reduce their damage by (gap × (2 + IQ×0.5))%. Scales with both IQ and the gap.' },
  // ── POST-COMBAT (triggers after round ends) ──────────────
  { id: 'learning',      name: 'Learning',      icon: '', weight: 1.8, type: 'post_combat', desc: 'On loss: deal 5% more damage next round (stacks each loss)' },
  { id: 'adaptation',    name: 'Adaptation',    icon: '', weight: 1.8, type: 'post_combat', desc: 'On loss: take (15 + BIQ×2)% less damage from the weapon type that killed you. [BIQ=5: 25% / BIQ=10: 35%]' },
  { id: 'survivor',      name: 'Survivor',      icon: '', weight: 1.2, type: 'post_combat', desc: 'Win at very low HP: permanently gain +10 max HP' },
  { id: 'veteran',       name: 'Veteran',       icon: '', weight: 1.2, type: 'post_combat', desc: 'On win: permanently gain +1 to a random stat' },
  { id: 'mastery',       name: 'Mastery',       icon: '', weight: 1.0, type: 'post_combat', desc: 'Win while injured: MA×3% chance to permanently boost weapon base damage' },
  { id: 'perfectionist', name: 'Perfectionist', icon: '', weight: 1.2, type: 'post_combat', desc: 'Win at high HP: +15% damage next round. Win while injured: -10% damage instead' },
  { id: 'blood_mark',    name: 'Blood Mark',    icon: '', weight: 0.8, type: 'post_combat', desc: 'On loss: curse the winner — They start their next match at only 80% HP' },
  { id: 'copycat',       name: 'Copycat',       icon: '', weight: 0.8, type: 'post_combat', desc: 'On win: BIQ×5% chance to copy a random skill from the opponent' },

  // ── UNIQUE SKILLS (Championship only — removed from pool once rolled) ──────
  { id: 'usurp',        name: 'Cướp Đoạt',    icon: '', weight: 0.8, type: 'pre_combat',  unique: true,
    desc: 'At round start, steal the opponent\'s weapon. They fight with Fists for the rest of the round.' },
  { id: 'shadow_clone', name: 'Shadow Clone',  icon: '', weight: 0.8, type: 'pre_combat',  unique: true,
    desc: 'Begin each round with a shadow clone. The first 2 hits against you are absorbed by the clone before it vanishes.' },
  { id: 'disarm', name: 'Disarm', icon: '⚔️',  weight: 0.8, type: 'in_combat',
    desc: 'On hit or on parry: disarm the enemy (30s cooldown). They drop their weapon on the floor and fight with Fists at −50% damage. Retrieve the weapon by touching it. Other fighters can kick it further away.' },

  // ── WEAPON SKILLS (only available if ball has matching weapon) ──
  // 🥊 Fists
  { id: 'iron_knuckles',   name: 'Iron Knuckles',    icon: '', weight: 1.0, type: 'in_combat',  weapon: 'fists',
    desc: 'Each hit permanently stacks +0.1 base damage for this round (cap scales with STR)' },
  { id: 'brawler_rhythm',  name: "Brawler's Rhythm",  icon: '', weight: 1.0, type: 'in_combat',  weapon: 'fists',
    desc: 'Every 5th hit deals ×2.5 damage. Being hit resets the chain' },
  { id: 'combo_breaker',   name: 'Combo Breaker',     icon: '', weight: 1.0, type: 'in_combat',  weapon: 'fists',
    desc: 'When hit while you have 3+ combo stacks, automatically counter-attack for free (scales with STR)' },
  { id: 'rage_fists',      name: 'Rage Fists',        icon: '', weight: 1.0, type: 'in_combat',  weapon: 'fists',
    desc: 'Below 50% HP: attack 35% faster' },

  // ⚔️ Sword
  { id: 'guard_stance',    name: 'Guard Stance',      icon: '', weight: 1.0, type: 'passive',    weapon: 'sword',
    desc: 'While your sword is on cooldown, take less damage (scales with BIQ, up to 30% reduction)' },
  { id: 'duel_instinct',   name: 'Duel Instinct',     icon: '', weight: 1.0, type: 'passive',    weapon: 'sword',
    desc: 'When only one enemy remains, deal 30% more damage' },
  { id: 'parry_punish',    name: 'Parry Punish',      icon: '', weight: 1.0, type: 'in_combat',  weapon: 'sword',
    desc: 'After a successful parry, deal ×2 dmg for (2 + IQ×0.2)s. [IQ=1: 2.2s / IQ=5: 3.0s / IQ=10: 4.0s]' },

  // 🗡️ Dagger
  { id: 'poison_blade',    name: 'Poison Blade',      icon: '', weight: 1.0, type: 'in_combat',  weapon: 'dagger',
    desc: 'Every 5th hit applies poison: 1.5 damage every 3 seconds for 12 seconds' },
  { id: 'flurry_finisher', name: 'Flurry Finisher',   icon: '', weight: 1.0, type: 'in_combat',  weapon: 'dagger',
    desc: 'Every 5th consecutive hit deals ×2.5 damage. Being hit resets the chain' },
  { id: 'shadow_strike',   name: 'Shadow Strike',     icon: '', weight: 1.0, type: 'in_combat',  weapon: 'dagger',
    desc: 'Every 10 seconds, your next hit is a guaranteed critical strike' },

  // 🔱 Spear
  { id: 'long_reach',      name: 'Long Reach',        icon: '', weight: 1.0, type: 'passive',    weapon: 'spear',
    desc: 'Start every round with +20px extra spear reach' },
  { id: 'skewer',          name: 'Skewer',            icon: '', weight: 1.0, type: 'in_combat',  weapon: 'spear',
    desc: "On hit: pin the enemy's weapon for (20 + BIQ×4) frames. [BIQ=1: 0.4s / BIQ=5: 0.67s / BIQ=10: 1.0s]" },
  { id: 'zone_control',    name: 'Zone Control',      icon: '', weight: 1.0, type: 'passive',    weapon: 'spear',
    desc: 'Enemies that stay within 150px of your spear tip take 0.5 damage per second' },

  // 🌙 Scythe
  { id: 'reapers_mark',    name: "Reaper's Mark",     icon: '', weight: 1.0, type: 'in_combat',  weapon: 'scythe',
    desc: 'Deal 80% more damage to enemies below 30% HP — Execute the wounded' },
  { id: 'soul_harvest',    name: 'Soul Harvest',      icon: '', weight: 1.0, type: 'in_combat',  weapon: 'scythe',
    desc: 'Each kill restores 10 HP (stacks freely in FFA)' },
  { id: 'grim_presence',   name: 'Grim Presence',     icon: '', weight: 1.0, type: 'passive',    weapon: 'scythe',
    desc: 'Enemies within 80px of you swing 12% slower (passive aura)' },

  // 🔨 Hammer
  { id: 'seismic_slam',    name: 'Seismic Slam',      icon: '', weight: 1.0, type: 'in_combat',  weapon: 'hammer',
    desc: 'On hit: release a shockwave that slows all enemies within 120px for 30 frames' },
  { id: 'heavy_momentum',  name: 'Heavy Momentum',    icon: '', weight: 1.0, type: 'in_combat',  weapon: 'hammer',
    desc: 'Each consecutive hit on the same enemy adds 20% damage (max 3 stacks). Switching target resets stacks' },
  { id: 'ground_pound',    name: 'Ground Pound',      icon: '', weight: 1.0, type: 'in_combat',  weapon: 'hammer',
    desc: "Every time you bounce off a wall, the nearest enemy's weapon locks for 25 frames" },

  // 🏹 Bow
  { id: 'sniper',          name: 'Sniper',            icon: '', weight: 1.0, type: 'in_combat',  weapon: 'bow',
    desc: 'Arrows shot at targets over 300px away deal ×(1.4 + IQ×0.03) damage. [IQ=1: ×1.43 / IQ=10: ×1.70]' },
  { id: 'volley',          name: 'Volley',            icon: '', weight: 1.0, type: 'pre_combat', weapon: 'bow',
    desc: 'First 3 arrows of the round deal ×(1.5 + IQ×0.05) damage. [IQ=1: ×1.55 / IQ=10: ×2.0]' },
  { id: 'piercing_shot',   name: 'Piercing Shot',     icon: '', weight: 1.0, type: 'in_combat',  weapon: 'bow',
    desc: 'Every 8th arrow pierces through the target and can hit enemies behind them' },

  // 🌟 Shuriken
  { id: 'bounce_damage',   name: 'Bounce Damage',     icon: '', weight: 1.0, type: 'passive',    weapon: 'shuriken',
    desc: 'Each wall bounce charges your shuriken with +15% damage (up to 3 bounces = +45%)' },
  { id: 'ricochet_kill',   name: 'Ricochet Kill',     icon: '', weight: 1.0, type: 'passive',    weapon: 'shuriken',
    desc: 'Shurikens that hit after 2 or more wall bounces deal +100% damage' },
  { id: 'fan_throw',       name: 'Fan Throw',         icon: '', weight: 1.0, type: 'in_combat',  weapon: 'shuriken',
    desc: 'Every 5th throw fires 3 shurikens in a fan spread instead of 1' },

  // ── SPAWN MECHANIC — Tier 1 ──────────────────────────────
  { id: 'soul_puppet',      name: 'Soul Puppet',       icon: '👻', weight: 1.0, type: 'in_combat',
    desc: 'On kill: launch 3 homing soul orbs toward random enemies (STR-scaled damage each).' },
  { id: 'bone_wall',        name: 'Bone Wall',          icon: '🦴', weight: 1.0, type: 'in_combat',
    desc: 'On being hit: scatter 5 bone shards outward, each dealing (STR×1.2) damage.' },
  { id: 'war_banner',       name: 'War Banner',         icon: '🚩', weight: 1.2, type: 'pre_combat',
    desc: 'Begin each round with +30% damage for 10 seconds.' },
  { id: 'necromancer_pact', name: "Necromancer's Pact", icon: '💀', weight: 0.8, type: 'pre_combat', category: 'summon',
    desc: 'Spawn 2 skeleton minions at round start. They seek enemies and deal (STR×0.8) damage per hit.' },

  // ── SPAWN MECHANIC — Tier 2 ──────────────────────────────
  { id: 'spirit_echo',      name: 'Spirit Echo',        icon: '🌀', weight: 1.2, type: 'in_combat',
    desc: 'Each hit has 40% chance to fire a spirit orb that deals (BIQ×0.6 + STR×0.4) extra damage.' },
  { id: 'horde_call',       name: 'Horde Call',         icon: '⚔️', weight: 0.8, type: 'in_combat',  category: 'summon',
    desc: 'Every 15 seconds, summon a wave of 3 skeleton minions.' },
  { id: 'mirror_clone',     name: 'Mirror Clone',       icon: '🪞', weight: 0.6, type: 'pre_combat', category: 'summon',
    desc: 'Spawn a mirror clone at round start with 50% of your stats. Clone fights independently and does not count toward the win.' },
  { id: 'plague_bearer',    name: 'Plague Bearer',      icon: '🦠', weight: 1.2, type: 'in_combat',
    desc: 'Hits apply plague: 2 damage every 2 seconds for 10 seconds. Stacks up to 3 times.' },

  // ── JJK DOMAINS (unique per match — 1 người 1 loại) ─────────
  { id: 'jjk_domain_malevolent', name: 'Phục ma Ngự trù tử', icon: '🩸', weight: 1.0, type: 'in_combat',
    category: 'jjk_domain', unique: true,
    desc: 'Giây 20: mở domain đỏ 10s. Mỗi giây, mưa chém gây 5 dmg (số chém tăng dần). Đối thủ bên trong −50% evade.' },
  { id: 'jjk_domain_unlimited',  name: 'Vô Lượng Không Xứ',  icon: '💜', weight: 1.0, type: 'in_combat',
    category: 'jjk_domain', unique: true,
    desc: 'Giây 20: mở domain tím 8s. Đối thủ bên trong: −70% speed, −50% evade. Parry stun của bạn nhân đôi.' },
  { id: 'jjk_domain_chimera',    name: 'Khảm Hợp Ám Đình',   icon: '🌑', weight: 1.0, type: 'in_combat',
    category: 'jjk_domain', unique: true,
    desc: 'Giây 20: mở domain bóng tối 15s. Bạn +20% evade, visual đổi thành bóng tối. Mỗi 5s triệu hồi 1 Shikigami (chết sau 1 đòn nhận / 2 đòn đánh).' },

  // ── JJK CURSE TECHNIQUES (không unique, có điều kiện trigger) ─
  { id: 'jjk_ct_command',    name: 'Chú Ngôn',        icon: '🛑', weight: 1.0, type: 'in_combat',
    category: 'jjk_ct',
    desc: 'Khi đối thủ vào tầm ~80px: hét "Dừng lại!" — đóng băng họ 1.5s. Cooldown 20s.' },
  { id: 'jjk_ct_blackflash', name: 'Kính Kình',       icon: '⚡', weight: 1.0, type: 'in_combat',
    category: 'jjk_ct', weapon: 'fists',
    desc: 'Fists only (+1 MA khi chọn). Sau mỗi đòn đánh: 80% nổ chú lực (90% dmg, 0.3s delay). Mỗi nổ có thể chain tiếp với xác suất giảm đôi.' },
  { id: 'jjk_ct_swap',       name: 'Bất Nghĩa Du Hí', icon: '🔀', weight: 1.0, type: 'in_combat',
    category: 'jjk_ct',
    desc: 'Khi Parry hoặc Evade: đổi vị trí tức thì với enemy gần nhất. Họ bị stun 0.5s. Bạn phóng về phía vị trí cũ của họ. Cooldown 15s.' },
  { id: 'jjk_ct_blood',      name: 'Xuyên Huyết',     icon: '💉', weight: 1.0, type: 'in_combat',
    category: 'jjk_ct',
    desc: 'Sau 4 đòn đánh: bắn tia máu xuyên thấu (tốc độ cực cao, piercing, aim thẳng enemy gần nhất). Cooldown 11s.' },

  // ── JOJO STANDS (unique per championship) ─────────────────
  { id: 'jojo_stand_star',  name: 'Star Platinum',  icon: '⭐', weight: 1.0, type: 'in_combat',
    category: 'jojo_stand', unique: true,
    desc: 'Triệu hồi Star Platinum cạnh bạn. Soul Link: Stand chia sẻ HP. 25% khi chạm enemy: ORA ORA ORA (10 đòn × 3 dmg, knockback ngẫu nhiên). Bạn nhận −10% dmg khi Stand còn sống.' },
  { id: 'jojo_stand_world', name: 'The World',       icon: '🌍', weight: 1.0, type: 'in_combat',
    category: 'jojo_stand', unique: true,
    desc: 'Triệu hồi The World. Khi Stand/chủ nhân gần enemy: ZA WARUDO — đóng băng thời gian 10s, chỉ bạn và Stand di chuyển. Cooldown 50s, tối đa 3 lần/trận.' },
  { id: 'jojo_stand_kq',    name: 'Killer Queen',    icon: '💀', weight: 1.0, type: 'in_combat',
    category: 'jojo_stand', unique: true,
    desc: 'Triệu hồi Killer Queen. Stand đặt bom khi chạm enemy (theo người) hoặc tường (tĩnh). Bom nổ khi: bearer chạm tường / đạn / ball khác — 20 dmg + knockback mạnh.' },
  { id: 'jojo_stand_ge',    name: 'Gold Experience', icon: '🌿', weight: 1.0, type: 'in_combat',
    category: 'jojo_stand', unique: true,
    desc: 'Triệu hồi Gold Experience. Khi chủ nhân nảy tường: spawn Rùa (melee) hoặc Rắn (ranged) — 4 dmg/đòn, tồn tại 10s. Cooldown 10s giữa mỗi lần spawn.' },

  // ── JOJO SUPPORT (không unique) ────────────────────────────
  { id: 'jojo_support_remote',    name: 'Remote Control', icon: '📡', weight: 1.0, type: 'passive',
    category: 'jojo_support',
    desc: 'Tăng gấp đôi bán kính hoạt động của Stand (150px → 300px). Stand truy đuổi được enemy ở xa hơn.' },
  { id: 'jojo_support_senses',    name: 'Shared Senses',  icon: '👁️', weight: 1.0, type: 'passive',
    category: 'jojo_support',
    desc: 'Stand thừa hưởng 100% Crit Chance và Evade Chance từ chủ nhân thay vì mức mặc định 5%.' },
  { id: 'jojo_support_evolution', name: 'Evolution',       icon: '📈', weight: 1.0, type: 'post_combat',
    category: 'jojo_support',
    desc: 'Sau mỗi trận thắng: Stand +10% kích thước, +5% dmg, −10% dmg nhận vào. Cộng dồn tối đa 5 lần.' },

  // ── ONE PIECE — Haki (không unique) ────────────────────────
  { id: 'op_haki_obs',  name: 'Observation Haki', icon: '👁', weight: 1.0, type: 'pre_combat',
    category: 'op_haki',
    desc: '+10% evade chance. Khi enemy trong 200px: vũ khí quay nhanh hơn (bonus spin mỗi frame).' },
  { id: 'op_haki_arm',  name: 'Armament Haki',    icon: '⚫', weight: 1.0, type: 'passive',
    category: 'op_haki',
    desc: '+10% dmg ra, −10% dmg nhận vào, +30% knockback delivered. Haki phủ lên vũ khí.' },
  { id: 'op_haki_conq', name: "Conqueror's Haki",  icon: '👑', weight: 0.8, type: 'in_combat',
    category: 'op_haki',
    desc: 'Khi enemy tiếp cận 220px: phóng Conqueror burst — stun 3s + shockwave thị giác. Cooldown 15s.' },

  // ── ONE PIECE — Devil Fruits (unique per championship) ──────
  { id: 'op_fruit_goro', name: 'Goro Goro no Mi', icon: '⚡', weight: 1.0, type: 'in_combat',
    category: 'op_fruit', unique: true,
    desc: 'Khi va chạm thân hoặc parry với enemy: 50% tỉ lệ biến thành tia sét — xuyên qua kẻ thù (10 dmg cố định, không nảy ngược), kéo dài 1.5s.' },
  { id: 'op_fruit_tori', name: 'Tori Tori no Mi', icon: '🐦', weight: 1.0, type: 'in_combat',
    category: 'op_fruit', unique: true,
    desc: 'Trước khi hoá phượng hoàng: −10% sát thương gây ra. Hồi 1 HP mỗi 2s. Khi HP ≤ 0: revive 1 lần tại 30% HP, +30% speed, −10% evade, giải debuff −10% DMG.' },
  { id: 'op_fruit_mera', name: 'Mera Mera no Mi', icon: '🔥', weight: 1.0, type: 'in_combat',
    category: 'op_fruit', unique: true,
    desc: 'Mỗi đòn đánh trúng: bén lửa lên enemy (2 dmg mỗi 2s, 5s). Không giới hạn stack.' },
  { id: 'op_fruit_ryu',  name: 'Ryu Ryu no Mi',   icon: '🦕', weight: 1.0, type: 'in_combat',
    category: 'op_fruit', unique: true,
    desc: 'Giây 20 (frame 1200): hoá khủng long — +20% kích thước, +10% melee dmg, tốc độ di chuyển giảm 40%.' },
  { id: 'op_fruit_hito', name: 'Hito Hito no Mi',  icon: '🌊', weight: 1.0, type: 'in_combat',
    category: 'op_fruit', unique: true,
    desc: 'Mỗi lần nảy tường: phát sóng chấn động mở rộng (tốc 4px/f, tối đa 160px) — enemies trong sóng nhận dmg.' },
  { id: 'op_fruit_neko', name: 'Neko Neko no Mi',  icon: '🐆', weight: 1.0, type: 'pre_combat',
    category: 'op_fruit', unique: true,
    desc: '+30% speed, +10% crit chance. Tấn công từ phía sau enemy (>110°): +50% bonus crit dmg (backstab).' },
  { id: 'op_fruit_pika', name: 'Pika Pika no Mi',  icon: '✨', weight: 1.0, type: 'in_combat',
    category: 'op_fruit', unique: true,
    desc: 'Mỗi lần nảy tường: hoá thành chùm sáng bay nhanh đến tường đối diện — trail vàng theo sau. Nếu chạm enemy trên đường bay: 70% dmg + hoá lại thành ball ngay lập tức. Cooldown 2s.' },
];

// ─── SKILL_MAP — tra cứu nhanh theo id ───────────────────────
// Ví dụ: SKILL_MAP['vampiric'] trả về object skill vampiric.
// Dùng để truyền vào flashSkillHUD() và addBattleLog().
const SKILL_MAP = Object.fromEntries(SKILL_DEFS.map(s => [s.id, s]));

// ─── applySkillPassives ───────────────────────────────────────
// Áp dụng các skill passive và bonus cross-round vào ball ngay
// sau khi Ball được tạo (gọi từ setup.js, sau constructor).
// Passive skill không có hook sự kiện — effect baked thẳng vào stats.
// Tham số: ball (Ball) — nhân vật cần áp dụng
//          fighter (object) — fighter record lưu trữ cross-round data
// Trả về: không có
function applySkillPassives(ball, fighter) {
  const sk = ball.skills;
  if (!sk || sk.length === 0) return;

  const SKF = window.SKILL_FORMULAS;
  if (sk.includes('iron_body'))   { ball.maxHp += SKF.iron_body.hpBonus; ball.hp = ball.maxHp; }
  if (sk.includes('swift'))       { ball.maxSpd *= SKF.swift.speedMult; ball.baseMaxSpd = ball.maxSpd; }
  if (sk.includes('sharp_eye'))   { ball.critChance += SKF.sharp_eye.critBonus; }
  if (sk.includes('heavy_mass'))  { ball.mass *= SKF.heavy_mass.massMult; }
  // Weapon passives applied at match start
  if (sk.includes('long_reach') && (ball.weaponDef?.id === 'spear' || ball.weaponDef?.baseWeapon === 'spear')) {
    ball.weapon.bonusLength = (ball.weapon.bonusLength || 0) + 20;
  }

  // Cross-round bonuses từ các round trước (Learning + Perfectionist tích lũy)
  // skillLearningMult nhân vào getDamage() — tăng mỗi lần thua (Learning +5%)
  // perfMult từ Perfectionist: thắng >80% HP→×1.15, thắng <80% HP→×0.90; reset sau khi dùng
  ball.skillLearningMult  = 1 + (fighter.learningBonus || 0);
  ball.skillLearningMult *= (fighter.perfMult || 1);
  fighter.perfMult        = 1;  // consumed — reset for next round
  ball.adaptResist        = fighter.adaptResist || null; // id vũ khí bị kháng (Adaptation)

  // Survivor: permanent max HP bonus accumulated over rounds
  if (fighter.survivorHPBonus) {
    ball.maxHp += fighter.survivorHPBonus;
    ball.hp     = ball.maxHp;
  }

  // Veteran: permanent stat bonuses
  if (fighter.veteranStats) {
    const vs = fighter.veteranStats;
    if (vs.STR) { ball.charSTR = (ball.charSTR || 5) + vs.STR; }
    if (vs.IQ)  { ball.charIQ  = (ball.charIQ  || 5) + vs.IQ;  }
    if (vs.BIQ) { ball.charBIQ = (ball.charBIQ || 5) + vs.BIQ; }
    if (vs.MA)  { ball.charMA  = (ball.charMA  || 5) + vs.MA;  }
    if (vs.SPD) {
      ball.charSPD = (ball.charSPD || 5) + vs.SPD;
      // maxSpd formula: 10 + charSPD * 1.5  →  each +1 SPD = +1.5 maxSpd
      ball.maxSpd     += vs.SPD * 1.5;
      ball.baseMaxSpd += vs.SPD * 1.5;
    }
  }

  // Blood Mark: opponent was marked by a loser — start round with 80% HP
  if (fighter.bloodMarked) {
    ball.hp = ball.maxHp * 0.80;
    fighter.bloodMarked = false; // consumed
    spawnDamageNumber(ball.x, ball.y - ball.radius - 18, '🩸 BLOOD MARKED', '#cc0000');
  }

  // Mastery: persistent weapon bonus from previous win(s)
  if (fighter.masteryDmgBonus) {
    ball.weapon.bonusDamage = (ball.weapon.bonusDamage || 0) + fighter.masteryDmgBonus;
  }
  if (fighter.masteryProjBonus && ball.weapon.shurikenCount !== undefined) {
    // Ranged (shuriken): add extra starting shurikens
    ball.weapon.shurikenCount = (ball.weapon.shurikenCount || 1) + fighter.masteryProjBonus;
  }

  // Copycat: add the learned skill for this round (if not already owned)
  if (fighter.copycatSkill && !ball.skills.includes(fighter.copycatSkill)) {
    ball.skills.push(fighter.copycatSkill);
    fighter.copycatSkill = null; // consumed
  }
}

// ─── initRoundSkillState ──────────────────────────────────────
// Khởi tạo object ball.skillState chứa toàn bộ trạng thái reactive
// cho một round: "ready flags", bộ đếm combo, cooldown, v.v.
// Gọi 1 lần mỗi round từ setup.js (sau applySkillPassives).
// Ball được tạo mới mỗi round nên state này luôn được reset.
// Tham số: ball (Ball)
// Trả về: không có — gắn trực tiếp ball.skillState
function initRoundSkillState(ball) {
  ball.skillState = {
    warCryReady:     ball.skills.includes('war_cry'),     // true = chưa dùng lần đầu round này
    fortifyShield:   ball.skills.includes('fortify'),     // true = shield HP còn hoạt động
    firstBloodReady: ball.skills.includes('first_blood'), // true = đòn đầu tiên chưa hạ
    cloneHits:       ball.skills.includes('shadow_clone') ? 2 : 0, // absorbs first 2 hits
    phoenixUsed:     false,     // Phoenix chỉ dùng được 1 lần/round
    counterActive:   false,     // true sau parry → đòn tiếp theo ×(1.5+BIQ×0.05)
    momentumStacks:  0,         // Momentum: kill trong FFA +10% speed/stack, max 5
    flowStateStacks: 0,         // Flow State: mỗi hit +stack, bị đánh trúng reset về 0
    predatorActive:  false,  // Predator: true khi enemy có HP < ball.hp (check đầu round)
    // ── Weapon skill states ──────────────────────────────
    brawlerChain:      0,       // Brawler's Rhythm: đếm hit liên tiếp (mục tiêu 5)
    brawlerReady:      false,   // true sau hit thứ 5 → đòn kế ×2.5
    flurryChain:       0,       // Flurry Finisher: đếm hit liên tiếp dagger
    flurryReady:       false,   // true sau hit thứ 5 → đòn kế ×2.5
    sk_dagHitCount:    0,       // Poison Blade: đếm tổng hit dagger (mod 5 → poison)
    sk_shadowTimer:    0,       // Shadow Strike: đếm frames đến guaranteed crit (600f = 10s)
    shadowStrikeCrit:  false,   // true = đòn tiếp theo là guaranteed crit
    pt1Stacks:         0,       // Parry Technique I: spin boost stacks (max 3, +5%/stack)
    parryPunishActive: false,   // Parry Punish: true trong window sau parry
    parryPunishTimer:  0,       // frame countdown cho Parry Punish window
    hammerStacks:      0,       // Heavy Momentum: stacks khi đánh cùng mục tiêu (max 3)
    hammerTarget:      null,    // mục tiêu hiện tại của Heavy Momentum
    sk_fanCount:       0,       // Fan Throw: đếm lần ném shuriken (mod 5 → bắn 3 cái)
    sk_bowShotCount:   0,       // đếm số mũi tên đã bắn
    sk_volleyCount:    ball.skills.includes('volley') ? 3 : 0, // 3 mũi đầu × Volley mult
    sk_zoneTimer:      0,       // Zone Control (Spear): tick damage nearby
    disarmLastUsed:    -9999,   // frame matchTime cuối lần dùng Disarm (cooldown 1800f = 30s)
    // Spawn skill states
    warBannerActive:   false,   // War Banner: true trong 10s đầu round
    warBannerTimer:    0,       // frame countdown (600f = 10s)
    hordeTimer:        0,       // Horde Call: đếm frame, 1200f → spawn 3 skeleton
  };
}

// ─── _demonPreCombat ─────────────────────────────────────────
// Xử lý hiệu ứng debuff đặc biệt của 2 subrace Demon:
//   Leviathan (Envy)  — đầu round: trừ 6 điểm 1 stat ngẫu nhiên của mỗi đối thủ
//   Asmodeus  (Lust)  — BO3+: seal N skill active của đối thủ (N = số active skill của mình)
//                       nếu mình có nhiều skill hơn đối thủ → đối thủ còn bị -1 tất cả stats
// Gọi nội bộ từ skillOnPreCombat().
// Virtues (Angel) miễn nhiễm với tất cả debuff ở đây.
// Tham số: ball (Ball) — con Demon đang xử lý
// Trả về: không có
function _demonPreCombat(ball) {
  const srlabel = ball.charSubrace?.label;
  if (!srlabel) return;
  const opponents = state.players.filter(p => p !== ball && p.alive &&
    (ball.teamId >= 0 ? p.teamId !== ball.teamId : true));
  if (!opponents.length) return;

  // Leviathan (Envy): opponent −6 to 1 random stat (in-combat only — Ball recreated each match)
  if (srlabel === 'Leviathan') {
    const SK = ['strength','speed','durability','iq','battleiq','ma'];
    const SH = { strength:'STR', speed:'SPD', durability:'DUR', iq:'IQ', battleiq:'BIQ', ma:'MA' };
    for (const opp of opponents) {
      if (_isVirtues(opp)) {
        spawnDamageNumber(opp.x, opp.y - opp.radius - 14, '👼 Virtues — immune!', '#aaccff');
        continue;
      }
      const stat = SK[Math.floor(Math.random() * SK.length)];
      switch (stat) {
        case 'strength':
          opp.charSTR = Math.max(0, (opp.charSTR ?? 5) - 6); break;
        case 'speed':
          opp.charSPD    = Math.max(0, (opp.charSPD ?? 5) - 6);
          opp.maxSpd     = Math.max(2, opp.maxSpd - 9);
          opp.baseMaxSpd = opp.maxSpd;
          break;
        case 'durability':
          opp.charDUR = Math.max(0, (opp.charDUR ?? 5) - 6);
          opp.maxHp   = Math.max(1, opp.maxHp - 60);
          opp.hp      = Math.min(opp.hp, opp.maxHp);
          break;
        case 'iq':
          opp.charIQ     = Math.max(0, (opp.charIQ ?? 5) - 6);
          opp.critChance = opp.charIQ * 0.03;
          opp.critMult   = 1.5 + Math.max(0, opp.charIQ - 10) * 0.1;
          break;
        case 'battleiq':
          opp.charBIQ     = Math.max(0, (opp.charBIQ ?? 5) - 6);
          opp.evadeChance = opp.charBIQ * 0.02;
          break;
        case 'ma':
          opp.charMA        = Math.max(0, (opp.charMA ?? 5) - 6);
          opp.deflectChance = opp.charMA * 0.02;
          break;
      }
      spawnDamageNumber(opp.x, opp.y - opp.radius - 18, `😈 −6 ${SH[stat]}!`, '#9933ff');
      if (typeof opp.shout === 'function') opp.shout('FAHHHHHH!', 180, '#9933ff');
    }
    if (typeof ball.shout === 'function') ball.shout('ENVY CORRUPTED!!', 200, '#9933ff');
  }

  // Asmodeus (Lust): disable N opponent skills + optional −1 all stats (BO3+ only, not BR)
  if (srlabel === 'Asmodeus') {
    const isBO3Plus = !!(state.bo3 && (state.bo3.winsNeeded ?? 2) > 1);
    const isBR      = state.matchMode === 'ffa';
    if (!isBO3Plus || isBR) return;

    // Count only active (non-passive) skills for Asmodeus comparisons
    const _isActive = sid => {
      const sdef = typeof SKILL_DEFS !== 'undefined' && SKILL_DEFS.find(s => s.id === sid);
      return sdef && sdef.type !== 'passive';
    };
    const ownN = (ball.skills || []).filter(_isActive).length;
    for (const opp of opponents) {
      if (_isVirtues(opp)) {
        spawnDamageNumber(opp.x, opp.y - opp.radius - 14, '👼 Virtues — immune!', '#aaccff');
        continue;
      }
      const oppN = (opp.skills || []).filter(_isActive).length;
      // Disable N random ACTIVE skills only — passive skills are already baked into
      // the Ball at applySkillPassives() time (HP, speed, etc.) so removing them here
      // would have no effect. Only active (triggerable) skills can be sealed.
      const activeSkills   = (opp.skills || []).filter(sid => {
        const sdef = typeof SKILL_DEFS !== 'undefined' && SKILL_DEFS.find(s => s.id === sid);
        return sdef && sdef.type !== 'passive';
      });
      const passiveSkills  = (opp.skills || []).filter(sid => !activeSkills.includes(sid));
      if (ownN > 0 && activeSkills.length > 0) {
        const n = Math.min(ownN, activeSkills.length);
        const shuffled = [...activeSkills];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        opp.skills = [...passiveSkills, ...shuffled.slice(n)]; // keep passives + unsealed actives
        spawnDamageNumber(opp.x, opp.y - opp.radius - 18,
          `😈 ${n} skill${n > 1 ? 's' : ''} sealed!`, '#ff44aa');
      }
      // If Asmodeus has more skills than opponent → opponent −1 all stats (in-combat)
      if (ownN > oppN) {
        opp.charSTR = Math.max(0, (opp.charSTR ?? 5) - 1);
        opp.charSPD = Math.max(0, (opp.charSPD ?? 5) - 1);
        opp.charDUR = Math.max(0, (opp.charDUR ?? 5) - 1);
        opp.charIQ  = Math.max(0, (opp.charIQ  ?? 5) - 1);
        opp.charBIQ = Math.max(0, (opp.charBIQ ?? 5) - 1);
        opp.charMA  = Math.max(0, (opp.charMA  ?? 5) - 1);
        opp.maxSpd     = Math.max(2, opp.maxSpd - 1.5);
        opp.baseMaxSpd = opp.maxSpd;
        opp.maxHp      = Math.max(1, opp.maxHp - 10);
        opp.hp         = Math.min(opp.hp, opp.maxHp);
        opp.evadeChance   = (opp.charBIQ ?? 0) * 0.02;
        opp.critChance    = (opp.charIQ  ?? 0) * 0.03;
        opp.critMult      = 1.5 + Math.max(0, (opp.charIQ ?? 0) - 10) * 0.1;
        opp.deflectChance = (opp.charMA  ?? 0) * 0.02;
        spawnDamageNumber(opp.x, opp.y - opp.radius - 28, `😈 −1 all stats!`, '#ff44aa');
      }
    }
    if (typeof ball.shout === 'function') ball.shout('LUST CORRUPTED!!', 200, '#ff44aa');
  }
}

// Called from ui.js + championship.js right after state.bo3 is created:
// gives opponent 1 starting win if Asmodeus is in the match (BO3+ only).
function applyAsmodeusBo3Bonus() {
  const bo3 = state.bo3;
  if (!bo3 || (bo3.winsNeeded ?? 2) <= 1) return;
  (bo3.fighters || []).forEach((f, idx) => {
    if (f?.charStats?.subrace?.label !== 'Asmodeus') return;
    const oppIdx = 1 - idx;
    const cap = (bo3.winsNeeded ?? 2) - 1; // don't let opponent win instantly
    bo3.wins[oppIdx] = Math.min((bo3.wins[oppIdx] ?? 0) + 1, cap);
  });
}

// ─── skillOnPreCombat ────────────────────────────────────────
// Hook chạy 1 lần khi countdown kết thúc → trận bắt đầu (từ game-loop).
// Xử lý: Demon subraces, arm pre_combat skills, Usurp, Shadow Clone,
//        Adrenaline, Troll Ice/Lich, War Banner, Necromancer, Mirror Clone,
//        Predator, Mind Break.
// Tham số: ball (Ball)
// Trả về: không có

// Helper: Virtues (Angel rank 5) miễn nhiễm tất cả debuff đầu round
function _isVirtues(ball) {
  return ball?.charRace === 'angel' && ball?.charSubrace?.label === 'Virtues';
}

function skillOnPreCombat(ball) {
  // Demon subrace effects fire regardless of own skill count
  if (ball.charRace === 'demon' && typeof state !== 'undefined') _demonPreCombat(ball);

  // JoJo Stand: spawn stand at round start
  if (typeof jojoOnPreCombat === 'function') jojoOnPreCombat(ball);
  // One Piece: pre-combat setup (Haki evade, Neko speed/crit, Tori regen init…)
  if (typeof opOnPreCombat === 'function') opOnPreCombat(ball);

  if (!ball.skills || ball.skills.length === 0) return;

  // Passive skills: handled by .always-active CSS class set in buildHUD() — no flash needed here.

  // Flash pre-combat skills (they arm themselves at round start)
  const preCombats = ['war_cry','fortify','adrenaline','predator','first_blood','shadow_clone',
                      'war_banner','necromancer_pact','mirror_clone'];
  for (const pid of preCombats) {
    if (ball.skills.includes(pid) && SKILL_MAP[pid]) flashSkillHUD(ball, SKILL_MAP[pid]);
  }

  // Usurp: steal one opponent's weapon — they fight with fists this round
  if (ball.skills.includes('usurp') && typeof state !== 'undefined') {
    const enemies = state.players.filter(p => p !== ball && p.alive
      && (ball.teamId >= 0 ? p.teamId !== ball.teamId : true)
      && p.weaponDef.id !== 'fists'
      && !_isVirtues(p)); // Virtues immune to weapon steal
    if (enemies.length > 0) {
      // Pick nearest enemy
      const target = enemies.reduce((best, p) =>
        Math.hypot(p.x-ball.x, p.y-ball.y) < Math.hypot(best.x-ball.x, best.y-ball.y) ? p : best);
      const stolenName = target.weaponDef.icon + ' ' + target.weaponDef.name;
      // Force target to use fists
      target.weaponDef   = WEAPON_MAP['fists'];
      target.weapon      = target._initWeapon('fists');
      spawnDamageNumber(target.x, target.y - target.radius - 18, `🫴 STOLEN!`, '#ff4444');
      spawnDamageNumber(ball.x,   ball.y   - ball.radius   - 18, `🫴 ${stolenName}`, '#ffd700');
      if (typeof ball.shout === 'function') ball.shout('GIVE ME THAT!', 200);
      if (typeof target.shout === 'function') target.shout('STOLEN!', 180, '#ff4444');
      if (typeof flashSkillHUD === 'function') flashSkillHUD(ball, SKILL_MAP['usurp']);
    }
  }

  // Shadow Clone: show announcement (clone HP absorbed in takeDamage)
  if (ball.skills.includes('shadow_clone')) {
    spawnDamageNumber(ball.x, ball.y - ball.radius - 18, '🌀 CLONE ACTIVE (2 hits)', '#aaddff');
  }

  if (ball.skills.includes('adrenaline')) {
    ball.adrenalineUntil = (state.matchTime || 0) + 300; // 5s × 60fps = 300 frames
    spawnDamageNumber(ball.x, ball.y - ball.radius - 12, '⚡ ADRENA!', '#ffee44');
  }

  // Troll Ice: -2 SPD (= -3 maxSpd) to all opponents at round start
  if (ball.charRace === 'troll' && ball.charSubrace?.label === 'Ice Troll') {
    for (const other of state.players) {
      if (other === ball || !other.alive) continue;
      if (_isVirtues(other)) {
        spawnDamageNumber(other.x, other.y - other.radius - 14, '👼 Virtues — immune!', '#aaccff');
        continue;
      }
      other.maxSpd     = Math.max(2, other.maxSpd - 3);
      other.baseMaxSpd = Math.max(2, other.baseMaxSpd - 3);
      spawnDamageNumber(other.x, other.y - other.radius - 14, '🧊 -3 Move Spd', '#88ccff');
    }
  }

  // Lich Troll: 75% chance to drain 1 random active skill from each opponent at round start
  if (ball.charRace === 'troll' && ball.charSubrace?.label === 'Lich Troll') {
    const _ltIsActive = sid => {
      const sdef = typeof SKILL_DEFS !== 'undefined' && SKILL_DEFS.find(s => s.id === sid);
      return sdef && sdef.type !== 'passive';
    };
    let anyDrained = false;
    for (const opp of state.players) {
      if (opp === ball || !opp.alive) continue;
      if (ball.teamId >= 0 && ball.teamId === opp.teamId) continue;
      if (_isVirtues(opp)) {
        spawnDamageNumber(opp.x, opp.y - opp.radius - 14, '👼 Virtues — immune!', '#aaccff');
        continue;
      }
      if (Math.random() >= 0.75) {
        spawnDamageNumber(opp.x, opp.y - opp.radius - 14, '🧟 Curse resisted!', '#887755');
        continue;
      }
      const active = (opp.skills || []).filter(_ltIsActive);
      if (active.length === 0) continue;
      const drained = active[Math.floor(Math.random() * active.length)];
      opp.skills = opp.skills.filter(s => s !== drained);
      spawnDamageNumber(opp.x, opp.y - opp.radius - 18, '🧟 1 skill drained!', '#aa44ff');
      anyDrained = true;
    }
    if (anyDrained && typeof ball.shout === 'function') ball.shout('SOUL DRAIN!', 210, '#aa44ff');
  }

  // War Banner: +30% damage for 10s
  if (ball.skills.includes('war_banner')) {
    ball.skillState.warBannerActive = true;
    ball.skillState.warBannerTimer  = 600; // 10s
    spawnDamageNumber(ball.x, ball.y - ball.radius - 18, '🚩 WAR BANNER!', '#ffaa33');
    flashSkillHUD(ball, SKILL_MAP['war_banner']);
  }

  // Necromancer's Pact: spawn 2 skeleton minions
  if (ball.skills.includes('necromancer_pact')) {
    _spawnSkillMinions(ball, 'skeleton', 2);
    spawnDamageNumber(ball.x, ball.y - ball.radius - 18, '💀 PACT!', '#aaffaa');
    flashSkillHUD(ball, SKILL_MAP['necromancer_pact']);
  }

  // Mirror Clone: spawn 1 clone fighter (full Ball)
  if (ball.skills.includes('mirror_clone') && typeof state !== 'undefined') {
    _spawnMirrorClone(ball);
    spawnDamageNumber(ball.x, ball.y - ball.radius - 18, '🪞 CLONE!', '#aaddff');
    flashSkillHUD(ball, SKILL_MAP['mirror_clone']);
  }

  // Predator: check HP once at round start — lock in for entire round
  if (ball.skills.includes('predator')) {
    const enemies = state.players.filter(p => p !== ball && p.alive);
    const anyWeaker = enemies.some(e => e.hp < ball.hp);
    ball.skillState.predatorActive = anyWeaker;
    if (anyWeaker) {
      spawnDamageNumber(ball.x, ball.y - ball.radius - 14, '🦅 PREDATOR!', '#ffaa33');
      flashSkillHUD(ball, SKILL_MAP['predator']);
    }
  }

  // Mind Break: if IQ > opponent's IQ → they deal less final damage this round
  if (ball.skills.includes('mind_break')) {
    for (const other of state.players) {
      if (other === ball || !other.alive) continue;
      if (ball.teamId >= 0 && ball.teamId === other.teamId) continue;
      if (_isVirtues(other)) continue; // Virtues immune
      const myIQ = ball.charIQ || 1;
      const theirIQ = other.charIQ || 1;
      if (myIQ > theirIQ) {
        const gap = myIQ - theirIQ;
        const debuff = gap * (0.02 + myIQ * 0.005);
        other.mindBreakDebuff = Math.min((other.mindBreakDebuff || 0) + debuff, 0.60);
        spawnDamageNumber(other.x, other.y - other.radius - 14,
          `🧿 MIND BREAK -${(debuff * 100).toFixed(0)}%`, '#cc88ff');
        flashSkillHUD(ball, SKILL_MAP['mind_break']);
      }
    }
  }
}

// ── DISARM helper ─────────────────────────────────────────────
function _doDisarm(attacker, defender) {
  if (!attacker.skills?.includes('disarm')) return;
  if (!defender?.alive) return;
  if (defender.weaponDef?.id === 'fists' || defender.weaponDef?.baseWeapon === 'fists') return;   // can't disarm fists (or iron_fist)
  if (defender.disarmedDebuff) return;               // already disarmed

  const cooldown = 1800; // 30s
  const lastUsed = attacker.skillState?.disarmLastUsed ?? -9999;
  const now = typeof state !== 'undefined' ? state.matchTime : 0;
  if (now - lastUsed < cooldown) return;

  if (attacker.skillState) attacker.skillState.disarmLastUsed = now;

  // Fling weapon away from attacker — high speed so it lands far
  const dx = defender.x - attacker.x, dy = defender.y - attacker.y;
  const dist = Math.hypot(dx, dy) || 1;
  const spd  = 12 + Math.random() * 6;  // 12–18 px/frame
  if (typeof state !== 'undefined') {
    state.droppedWeapons = state.droppedWeapons || [];
    state.droppedWeapons.push({
      x: defender.x, y: defender.y,
      vx: (dx/dist) * spd + (Math.random()-0.5)*3,
      vy: (dy/dist) * spd + (Math.random()-0.5)*3,
      owner:       defender,
      weaponDef:   defender.weaponDef,
      weaponState: defender.weapon,
      r: 20,
      angle: Math.random() * Math.PI * 2,
      life: 1800, maxLife: 1800,
      kickCooldown: 0,
      spawnGrace: 45,  // không thể nhặt trong 45 frame đầu
    });
  }

  // Switch defender to temp fists
  defender._disarmedOrigDef    = defender.weaponDef;
  defender._disarmedOrigWeapon = defender.weapon;
  defender.weaponDef   = WEAPON_MAP['fists'];
  defender.weapon      = defender._initWeapon('fists');
  defender.disarmedDebuff = true;

  spawnDamageNumber(defender.x, defender.y - defender.radius - 26, '⚔️ DISARMED!', '#ffaa00');
  if (typeof defender.shout === 'function') defender.shout('⚔️ DISARMED!!', 220, '#ffaa00');
  addBattleLog('skill_trigger', { attacker: getBallLabel(attacker), aColor: attacker.color,
    text: `⚔️ Disarm → ${getBallLabel(defender)} dropped ${defender._disarmedOrigDef?.name}!` });
  flashSkillHUD(attacker, SKILL_MAP['disarm']);
  if (typeof audienceReact === 'function') audienceReact('disarm_react');
}

// ── Patkinsion self-disarm helper ──────────────────────────────
// Trigger: 20% chance on parry / successful hit / wall bounce (5s cooldown)
function _patkinsionSelfDisarm(ball) {
  if (!ball.charDevs?.includes('patkinsion')) return;
  if (!ball.alive) return;
  if (ball.weaponDef?.id === 'fists' || ball.weaponDef?.baseWeapon === 'fists') return;
  if (ball.disarmedDebuff) return;

  const now = typeof state !== 'undefined' ? state.matchTime : 0;
  ball._patkinsionCd = ball._patkinsionCd || -9999;
  if (now - ball._patkinsionCd < 300) return; // 5s cooldown (300 frames)
  if (Math.random() > 0.20) return;           // 20% chance
  ball._patkinsionCd = now;

  // Fling weapon in random direction
  const ang = Math.random() * Math.PI * 2;
  const spd = 8 + Math.random() * 5;
  if (typeof state !== 'undefined') {
    state.droppedWeapons = state.droppedWeapons || [];
    state.droppedWeapons.push({
      x: ball.x, y: ball.y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      owner:       ball,
      weaponDef:   ball.weaponDef,
      weaponState: ball.weapon,
      r: 20,
      angle: Math.random() * Math.PI * 2,
      life: 1800, maxLife: 1800,
      kickCooldown: 0,
      spawnGrace: 45,
    });
  }

  ball._disarmedOrigDef    = ball.weaponDef;
  ball._disarmedOrigWeapon = ball.weapon;
  ball.weaponDef   = WEAPON_MAP['fists'];
  ball.weapon      = ball._initWeapon('fists');
  ball.disarmedDebuff = true;

  spawnDamageNumber(ball.x, ball.y - ball.radius - 26, '🤲 DROPPED!', '#cc88ff');
  if (typeof ball.shout === 'function') ball.shout('🤲 oops...', 180, '#cc88ff');
  addBattleLog('char_dev', { attacker: getBallLabel(ball), aColor: ball.color,
    text: `🤲 Patkinsion — ${getBallLabel(ball)} dropped their own weapon!` });
}

// ─── skillOnHit ──────────────────────────────────────────────
// Hook chạy mỗi khi một đòn tấn công chạm đích (melee hoặc projectile).
// Gọi từ _checkWeaponHit() (collision.js) và resolveProjectiles().
// Xử lý tất cả in_combat skills phía attacker:
//   War Cry (tiêu thụ sau hit đầu), First Blood (stun), Counter (tiêu thụ),
//   Flow State (stack tốc độ), Vampiric (hồi máu), Human Limit Break,
//   Orc Blood Price burst, Spirit Echo, Plague Bearer.
// Sau đó gọi weaponSkillOnHit() cho weapon-specific skills.
// Tham số: attacker (Ball), defender (Ball), dmg (number) — dame thực tế đã áp dụng
// Trả về: không có
function skillOnHit(attacker, defender, dmg) {
  const sk = attacker.skillState;
  if (!sk) return;

  // War Cry: consume after first successful hit
  if (sk.warCryReady) {
    sk.warCryReady = false;
    flashSkillHUD(attacker, SKILL_MAP['war_cry']);
    addBattleLog('skill_trigger', { attacker: getBallLabel(attacker), aColor: attacker.color, text: '📣 War Cry!' });
  }

  // First Blood: stun duration scales BIQ — 20 + BIQ×4 frames (BIQ=5→40f, BIQ=10→60f)
  if (sk.firstBloodReady) {
    sk.firstBloodReady = false;
    const fbStun = 20 + (attacker.charBIQ || 0) * 4;
    defender.weapon.spinSlowTimer = Math.max(defender.weapon.spinSlowTimer, fbStun);
    spawnDamageNumber(defender.x, defender.y - defender.radius - 18, `🩸 STUNNED! (${(fbStun/60).toFixed(1)}s)`, '#ff6633');
    flashSkillHUD(attacker, SKILL_MAP['first_blood']);
    addBattleLog('skill_trigger', { attacker: getBallLabel(attacker), aColor: attacker.color, text: `🩸 First Blood — stunned ${getBallLabel(defender)} (${(fbStun/60).toFixed(1)}s)` });
  }

  // Counter: consume after use (mult already applied in getDamage); fix 2: clear expiry too
  if (sk.counterActive) {
    sk.counterActive = false;
    sk.counterExpiry = null;
    flashSkillHUD(attacker, SKILL_MAP['counter']);
    addBattleLog('skill_trigger', { attacker: getBallLabel(attacker), aColor: attacker.color, text: '🔄 Counter!' });
  }

  // Disarm: trigger on hit
  _doDisarm(attacker, defender);

  // Flow State: +MA×1% max speed per consecutive hit (reset on being hit)
  if (attacker.skills.includes('flow_state')) {
    const stacks = (attacker.skillState.flowStateStacks || 0) + 1;
    attacker.skillState.flowStateStacks = stacks;
    const ma = attacker.charMA || 0;
    spawnDamageNumber(attacker.x, attacker.y - attacker.radius - 14,
      `🌊 FLOW ×${stacks} (+${(ma * stacks).toFixed(0)}%)`, '#44ddff');
    flashSkillHUD(attacker, SKILL_MAP['flow_state']);
  }

  // Vampiric: hồi 5% dame đã gây, tối thiểu 1 HP/hit (nhân hệ số Overtime)
  // getOvertimeHealMult() → 1.0 trước 80s, fade về 0.0 lúc 2:00
  if (attacker.skills.includes('vampiric')) {
    const healMult = typeof getOvertimeHealMult === 'function' ? getOvertimeHealMult() : 1;
    const heal = Math.max(healMult > 0 ? 1 : 0, dmg * window.SKILL_FORMULAS.vampiric.healPct * healMult);
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
    spawnDamageNumber(attacker.x, attacker.y - attacker.radius, '+' + heal.toFixed(1), '#88ff88');
    addBattleLog('heal', { attacker: getBallLabel(attacker), aColor: attacker.color, heal, hpAfter: +attacker.hp.toFixed(1), source: 'Vampiric' });
    flashSkillHUD(attacker, SKILL_MAP['vampiric']);
  }

  // ── Race: Human Limit Break stack + burst knockback ─────────────
  if (attacker.charRace === 'human' && attacker.rs_active) {
    attacker.rs_stacks = (attacker.rs_stacks || 0) + 1;
    // Show counter on first hit, then every 2 hits after
    if (attacker.rs_stacks <= 2 || attacker.rs_stacks % 2 === 0) {
      spawnDamageNumber(attacker.x, attacker.y - attacker.radius - 14,
        `⚡ ×${attacker.rs_stacks}`, '#ffdd00');
    }
    // Burst knockback: launch enemy hard, then attacker backs off
    if (defender && defender.alive) {
      const dx = defender.x - attacker.x, dy = defender.y - attacker.y;
      const dist = Math.hypot(dx, dy) || 1;
      const force = 11;   // strong punch-through knockback
      defender.vx += (dx / dist) * force;
      defender.vy += (dy / dist) * force;
      spawnSparks(defender.x, defender.y, 10);
    }
    attacker.rs_lbBackoffTimer = 30;  // ~0.5s backoff before next charge
  }

  // ── Race: Orc Blood Price burst consume ──────────────────────
  if (attacker.charRace === 'orc' && attacker.raceSkillDef && attacker.rs_burstReady) {
    attacker.rs_burstReady = false;
    const healAmt = Math.round((attacker.charDUR ?? 5) * 0.96); // DUR×1.2 × 0.8 (−20%)
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmt);
    spawnDamageNumber(attacker.x, attacker.y - attacker.radius - 26, `🩸 BURST! +${healAmt}HP`, '#ff3333');
    spawnSparks(attacker.x, attacker.y, 10);
    addBattleLog('race_skill', { attacker: getBallLabel(attacker), aColor: attacker.color, text: `🩸 Blood Price burst!` });
    addBattleLog('heal', { attacker: getBallLabel(attacker), aColor: attacker.color, heal: healAmt, hpAfter: +attacker.hp.toFixed(1), source: 'Blood Price' });
  }

  // Spirit Echo: 40% chance to fire a spirit orb toward defender
  if (attacker.skills.includes('spirit_echo') && defender?.alive && typeof state !== 'undefined') {
    if (Math.random() < 0.40) {
      const dx = defender.x - attacker.x, dy = defender.y - attacker.y;
      const d  = Math.hypot(dx, dy) || 1;
      const spd = 6;
      const echoDmg = (attacker.charBIQ ?? 5) * 0.6 + (attacker.charSTR ?? 5) * 0.4;
      const orb = new Projectile(attacker.x, attacker.y, (dx/d)*spd, (dy/d)*spd, attacker, 'spirit_orb', echoDmg);
      orb.lifetimer = 180; // 3s
      orb.trackTarget = defender;
      state.projectiles.push(orb);
      flashSkillHUD(attacker, SKILL_MAP['spirit_echo']);
    }
  }

  // Plague Bearer: apply plague stack to defender (up to 3 stacks)
  if (attacker.skills.includes('plague_bearer') && defender?.alive) {
    const stacks = Math.min(3, (defender._plagueStacks || 0) + 1);
    defender._plagueStacks = stacks;
    defender._plagueTimer  = 600; // 10s reset on each new hit
    defender._plagueTick   = defender._plagueTick || 0;
    defender._plagueOwner  = attacker;
    spawnDamageNumber(defender.x, defender.y - defender.radius - 14,
      `🦠 PLAGUE ×${stacks}`, '#44cc44');
    flashSkillHUD(attacker, SKILL_MAP['plague_bearer']);
  }

  // ── Race: Primordial Void Grip ────────────────────────────────
  if (typeof raceSkillOnHitDefending === 'function') raceSkillOnHitDefending(attacker, defender);
  // One Piece: Mera Mera burn on hit + Neko backstab bonus
  if (typeof opOnHit === 'function') opOnHit(attacker, defender, dmg);
  // ── Weapon-specific skills ────────────────────────────────────
  weaponSkillOnHit(attacker, defender, dmg);
}

// ─── weaponSkillOnHit ────────────────────────────────────────
// Xử lý các skill gắn với loại vũ khí cụ thể (weapon: 'fists', 'dagger'…).
// Gọi từ skillOnHit() ngay trước khi kết thúc.
// wid dùng baseWeapon (vũ khí gốc) thay vì id thực — vì unique weapon (shadowfang,
// rapier, caliburn…) kế thừa logic skill từ vũ khí cơ bản tương ứng.
// Tham số: attacker (Ball), defender (Ball), dmg (number)
// Trả về: không có
function weaponSkillOnHit(attacker, defender, dmg) {
  const sk = attacker.skillState;
  if (!sk) return;
  // Dùng baseWeapon để unique weapon vẫn trigger skill của vũ khí gốc
  // Ví dụ: shadowfang.baseWeapon = 'dagger' → shadow_strike vẫn hoạt động
  const wid = attacker.weaponDef?.baseWeapon || attacker.weaponDef?.id;

  // Shadow Strike (Dagger): consume guaranteed crit flag
  if (sk.shadowStrikeCrit && wid === 'dagger') {
    sk.shadowStrikeCrit = false;
    sk.sk_shadowTimer   = 0;
    spawnDamageNumber(attacker.x, attacker.y - attacker.radius - 18, '🌑 SHADOW CRIT!', '#aa44ff');
    if (typeof flashSkillHUD === 'function') flashSkillHUD(attacker, SKILL_MAP['shadow_strike']);
  }

  // Iron Knuckles (Fists): each hit +0.1 base dmg, capped at STR×0.1
  if (attacker.skills.includes('iron_knuckles') && wid === 'fists') {
    const maxBonus = (attacker.charSTR || 5) * 0.1;
    attacker.weapon.bonusDamage = Math.min((attacker.weapon.bonusDamage || 0) + 0.1, maxBonus);
    spawnDamageNumber(attacker.x, attacker.y - attacker.radius - 14,
      `👊 +${attacker.weapon.bonusDamage.toFixed(1)}`, '#ffaa33');
    if (typeof flashSkillHUD === 'function') flashSkillHUD(attacker, SKILL_MAP['iron_knuckles']);
  }

  // Brawler's Rhythm (Fists): 5-hit chain → ×2.5 (hit already applied via getDamage brawlerReady flag)
  if (attacker.skills.includes('brawler_rhythm') && wid === 'fists') {
    if (sk.brawlerReady) {
      sk.brawlerReady = false;
      sk.brawlerChain = 0;
      spawnDamageNumber(attacker.x, attacker.y - attacker.radius - 20, '🥊 RHYTHM! ×2.5', '#ffaa33');
      if (typeof flashSkillHUD === 'function') flashSkillHUD(attacker, SKILL_MAP['brawler_rhythm']);
    } else {
      sk.brawlerChain = (sk.brawlerChain || 0) + 1;
      if (sk.brawlerChain >= 4) {
        sk.brawlerReady = true;
        spawnDamageNumber(attacker.x, attacker.y - attacker.radius - 14, '🥊 NEXT HITS ×2.5!', '#ff8833');
      }
    }
  }

  // Flurry Finisher (Dagger): 5-hit consecutive chain → ×2.5
  if (attacker.skills.includes('flurry_finisher') && wid === 'dagger') {
    if (sk.flurryReady) {
      sk.flurryReady = false;
      sk.flurryChain = 0;
      spawnDamageNumber(attacker.x, attacker.y - attacker.radius - 20, '💨 FLURRY! ×2.5', '#44ddff');
      if (typeof flashSkillHUD === 'function') flashSkillHUD(attacker, SKILL_MAP['flurry_finisher']);
    } else {
      sk.flurryChain = (sk.flurryChain || 0) + 1;
      if (sk.flurryChain >= 4) {
        sk.flurryReady = true;
        spawnDamageNumber(attacker.x, attacker.y - attacker.radius - 14, '💨 NEXT HITS ×2.5!', '#44aaff');
      }
    }
  }

  // Poison Blade (Dagger): every 5th hit → apply poison
  if (attacker.skills.includes('poison_blade') && wid === 'dagger') {
    sk.sk_dagHitCount = (sk.sk_dagHitCount || 0) + 1;
    if (sk.sk_dagHitCount % 5 === 0) {
      defender.sk_poisonDuration = 12 * 60;
      defender.sk_poisonTick     = 0;
      defender.sk_poisonDmg      = 1.5;
      defender.sk_poisonOwner    = attacker;
      spawnDamageNumber(defender.x, defender.y - defender.radius - 16, '🐍 POISONED!', '#44cc44');
      if (typeof flashSkillHUD === 'function') flashSkillHUD(attacker, SKILL_MAP['poison_blade']);
    }
  }

  // Skewer (Spear): pin duration scales BIQ — 20 + BIQ×4 frames (BIQ=5→40f, BIQ=10→60f)
  if (attacker.skills.includes('skewer') && wid === 'spear') {
    const skewPin = 20 + (attacker.charBIQ || 0) * 4;
    defender.stunTimer = Math.max(defender.stunTimer || 0, skewPin);
    spawnDamageNumber(defender.x, defender.y - defender.radius - 16, `📌 SKEWERED! (${(skewPin/60).toFixed(1)}s)`, '#ffaa33');
    if (typeof flashSkillHUD === 'function') flashSkillHUD(attacker, SKILL_MAP['skewer']);
  }

  // Seismic Slam (Hammer): AoE shockwave slow to nearby enemies
  if (attacker.skills.includes('seismic_slam') && wid === 'hammer' && typeof state !== 'undefined') {
    let shockHit = false;
    for (const en of state.players) {
      if (en === attacker || !en.alive || en === defender) continue;
      if (Math.hypot(en.x - defender.x, en.y - defender.y) < 120) {
        en.weapon.spinSlowTimer = Math.max(en.weapon.spinSlowTimer || 0, 30);
        spawnDamageNumber(en.x, en.y - en.radius - 14, '🌍 SHOCKWAVE', '#ff9933');
        shockHit = true;
      }
    }
    if (shockHit && typeof flashSkillHUD === 'function') flashSkillHUD(attacker, SKILL_MAP['seismic_slam']);
  }

  // Heavy Momentum (Hammer): same-target stacking +20% dmg (max 3 stacks)
  if (attacker.skills.includes('heavy_momentum') && wid === 'hammer') {
    if (sk.hammerTarget === defender) {
      sk.hammerStacks = Math.min(3, (sk.hammerStacks || 0) + 1);
    } else {
      sk.hammerStacks = 1;
      sk.hammerTarget = defender;
    }
    spawnDamageNumber(attacker.x, attacker.y - attacker.radius - 14,
      `⚡ MOMENTUM ×${sk.hammerStacks}`, '#ffdd44');
    if (typeof flashSkillHUD === 'function') flashSkillHUD(attacker, SKILL_MAP['heavy_momentum']);
  }

  // Patkinsion: 20% self-disarm when landing a hit
  _patkinsionSelfDisarm(attacker);

  // JJK Curse Techniques: Kính Kình + Xuyên Huyết
  if (typeof jjkOnHit === 'function') jjkOnHit(attacker, defender, dmg);
}

// ─── skillOnParry ────────────────────────────────────────────
// Hook chạy khi hai vũ khí đụng nhau theo góc hợp lệ (parry detection trong collidePair).
// Gọi sau khi stun + knockback đã được áp dụng.
// Cả hai ball được truyền vào — vòng lặp xử lý mỗi ball một lần làm "người parry".
// Xử lý: Counter arm, Parry Tech I/II, Rapier/Caliburn riposte stack,
//        Raijin bounce reset, Caliburn burst, Parry Punish, Disarm on-parry.
// Tham số: b1 (Ball), b2 (Ball) — hai ball vừa parry nhau
// Trả về: không có
function skillOnParry(b1, b2) {
  for (const [ball, opp] of [[b1, b2], [b2, b1]]) {
    // Counter: arm the next attack for 2× damage
    if (ball.skillState && ball.skills?.includes('counter') && !ball.skillState.counterActive) {
      ball.skillState.counterActive = true;
      spawnDamageNumber(ball.x, ball.y - ball.radius, 'COUNTER!', '#ff8833');
      flashSkillHUD(ball, SKILL_MAP['counter']);
    }
    // Parry Technique I: reverse weapon spin + stack +5% spin speed (max 3 stacks)
    if (ball.skills?.includes('parry_tech_1')) {
      ball.weapon.spinDir = (ball.weapon.spinDir || 1) * -1;
      if (ball.skillState) {
        ball.skillState.pt1Stacks = Math.min(3, (ball.skillState.pt1Stacks || 0) + 1);
        const pct = ball.skillState.pt1Stacks * 5;
        spawnDamageNumber(ball.x, ball.y - ball.radius - 14, `🔄 ×${ball.skillState.pt1Stacks} (+${pct}%)`, '#88ddff');
      } else {
        spawnDamageNumber(ball.x, ball.y - ball.radius - 14, '🔄 SPIN REVERSE!', '#88ddff');
      }
      flashSkillHUD(ball, SKILL_MAP['parry_tech_1']);
    }
    // Parry Technique II: no knockback + spin boost BIQ-scaled + counter window BIQ-scaled
    if (ball.skills?.includes('parry_tech_2')) {
      const biq = ball.charBIQ || 0;
      ball.weapon.spinBoostTimer = 60 + biq * 6;
      const pmWindow = biq * 4;
      if (pmWindow > 0 && ball.skillState) {
        ball.skillState.counterActive = true;
        ball.skillState.counterExpiry = (typeof state !== 'undefined' ? state.matchTime : 0) + pmWindow;
      }
      spawnDamageNumber(ball.x, ball.y - ball.radius - 14, '⚡ PARRY TECH II!', '#cc88ff');
      flashSkillHUD(ball, SKILL_MAP['parry_tech_2']);
    }
    // Rapier / Caliburn: parry → +1 riposte stack (max 3) + open riposte window
    // Also handle Caliburn parry stack → speed boost
    if (ball.weaponDef?.id === 'rapier' || ball.weaponDef?.id === 'caliburn') {
      const biq = ball.charBIQ ?? 0;
      ball.weapon.riposteStacks  = Math.min(3, (ball.weapon.riposteStacks || 0) + 1);
      ball.weapon.riposteWindow  = Math.max(40, 10 + biq * 6);
      spawnDamageNumber(ball.x, ball.y - ball.radius - 16,
        `🛡️ PARRY! (${ball.weapon.riposteStacks}✦)`, '#aae0ff');
    }
    // Blessed by Raijin: being parried resets momentum stacks
    if (ball.charRace === 'god' && ball.charSubrace?.label === 'Blessed by Raijin' && (ball.rs_speedStacks || 0) > 0) {
      ball.rs_speedStacks = 0;
      ball.maxSpd = ball.baseMaxSpd;
      spawnDamageNumber(ball.x, ball.y - ball.radius - 16, '⚡ PARRIED!', '#aaddff');
    }
    // Caliburn: parry → +1 caliburn stack (max 3). At 3: speed boost + guaranteed crit
    if (ball.weaponDef?.id === 'caliburn') {
      ball.weapon.caliburnStacks = Math.min(3, (ball.weapon.caliburnStacks || 0) + 1);
      spawnDamageNumber(ball.x, ball.y - ball.radius - 20,
        `⚡ CALIBURN ×${ball.weapon.caliburnStacks}`, '#ccf0ff');
      if (ball.weapon.caliburnStacks >= 3) {
        ball.weapon.caliburnSpeedTimer = 300; // 5s boost
        ball.weapon.caliburnCrit = true;
        ball.weapon.caliburnStacks = 0;
        spawnDamageNumber(ball.x, ball.y - ball.radius - 28, 'BURST!', '#ffee44');
        if (typeof ball.shout === 'function') ball.shout('CALIBURN BURST!', 200, '#ffee44');
      }
    }
    // Parry Punish (Sword): window scales IQ — (2 + IQ×0.2)s (IQ=5→3s, IQ=10→4s)
    if (ball.skills?.includes('parry_punish') && (ball.weaponDef?.id === 'sword' || ball.weaponDef?.baseWeapon === 'sword')) {
      const ppFrames = Math.round((2 + (ball.charIQ || 0) * 0.2) * 60);
      ball.skillState.parryPunishActive = true;
      ball.skillState.parryPunishTimer  = ppFrames;
      spawnDamageNumber(ball.x, ball.y - ball.radius - 18, `🗡️ PUNISH! (${(ppFrames/60).toFixed(1)}s)`, '#ffdd00');
      if (typeof flashSkillHUD === 'function') flashSkillHUD(ball, SKILL_MAP['parry_punish']);
    }

    // Disarm: trigger on parry (ball parried, opp gets disarmed)
    _doDisarm(ball, opp);

    // Patkinsion: 20% self-disarm when parrying
    _patkinsionSelfDisarm(ball);
  }

  // JJK Curse Techniques: Bất Nghĩa Du Hí + Unlimited Void parry boost
  if (typeof jjkOnParry === 'function') jjkOnParry(b1, b2);
}

// ─── skillOnEvade ────────────────────────────────────────────
// Hook chạy khi ball tránh được đòn (evade roll thành công trong takeDamage).
// Hiện tại chỉ xử lý Shadow Step: teleport đến vị trí ngẫu nhiên trong arena.
// Tham số: ball (Ball) — ball vừa evade
// Trả về: không có
function skillOnEvade(ball) {
  // JJK Curse Techniques: Bất Nghĩa Du Hí position swap
  if (typeof jjkOnEvade === 'function') jjkOnEvade(ball);

  if (!ball.skills?.includes('shadow_step')) return;
  const a = state.arena;
  let cx, cy, r;
  if (a.type === 'circle') {
    cx = a.cx; cy = a.cy; r = a.r * 0.65;
  } else {
    cx = (a.x || 0) + (a.w || 800) / 2;
    cy = (a.y || 0) + (a.h || 800) / 2;
    r  = Math.min(a.w || 800, a.h || 800) * 0.33;
  }
  const angle = Math.random() * Math.PI * 2;
  const dist  = r * (0.2 + Math.random() * 0.8);
  ball.x = cx + Math.cos(angle) * dist;
  ball.y = cy + Math.sin(angle) * dist;
  ball.vx *= 0.3;
  ball.vy *= 0.3;
  spawnSparks(ball.x, ball.y, 14);
  spawnDamageNumber(ball.x, ball.y - ball.radius, 'SHADOW STEP!', '#cc88ff');
  flashSkillHUD(ball, SKILL_MAP['shadow_step']);
}

// ─── skillOnKill ─────────────────────────────────────────────
// Hook chạy khi một ball hạ gục đối thủ (HP ≤ 0, gọi từ takeDamage hoặc flame tick).
// Xử lý: Soul Puppet (bắn 3 soul orb homing), Blood Frenzy (+25 HP),
//        Soul Harvest (scythe +10 HP), Momentum (+10% speed/kill, FFA only).
// Tham số: killer (Ball), victim (Ball)
// Trả về: không có
function skillOnKill(killer, victim) {
  if (!killer || !killer.skillState) return;

  // Soul Puppet: on kill → fire 3 homing soul orbs toward random alive enemies
  if (killer.skills?.includes('soul_puppet') && typeof state !== 'undefined') {
    const enemies = state.players.filter(p => p.alive && p !== killer &&
      (killer.teamId >= 0 ? p.teamId !== killer.teamId : true));
    if (enemies.length > 0) {
      for (let i = 0; i < 3; i++) {
        const target = enemies[Math.floor(Math.random() * enemies.length)];
        const dx = target.x - killer.x, dy = target.y - killer.y;
        const d  = Math.hypot(dx, dy) || 1;
        const spd = 4.5 + Math.random() * 1.5;
        const aDev = (Math.random() - 0.5) * 0.6;
        const orbDmg = (killer.charSTR ?? 5) * 1.5;
        const orb = new Projectile(killer.x, killer.y,
          Math.cos(Math.atan2(dy,dx)+aDev)*spd, Math.sin(Math.atan2(dy,dx)+aDev)*spd,
          killer, 'soul_orb', orbDmg);
        orb.lifetimer   = 240; // 4s
        orb.trackTarget = target;
        state.projectiles.push(orb);
      }
      spawnDamageNumber(killer.x, killer.y - killer.radius - 18, '👻 SOUL PUPPET!', '#cc44ff');
      flashSkillHUD(killer, SKILL_MAP['soul_puppet']);
    }
  }

  // Blood Frenzy: heal 25 HP
  if (killer.skills?.includes('blood_frenzy')) {
    killer.hp = Math.min(killer.maxHp, killer.hp + 25);
    spawnDamageNumber(killer.x, killer.y - killer.radius, '+25 HP', '#ff4466');
    addBattleLog('heal', { attacker: getBallLabel(killer), aColor: killer.color, heal: 25, hpAfter: +killer.hp.toFixed(1), source: 'Blood Frenzy' });
    flashSkillHUD(killer, SKILL_MAP['blood_frenzy']);
  }
  // Soul Harvest (Scythe): on kill → +10 HP
  if (killer.skills?.includes('soul_harvest') && (killer.weaponDef?.id === 'scythe' || killer.weaponDef?.baseWeapon === 'scythe')) {
    killer.hp = Math.min(killer.maxHp, killer.hp + 10);
    spawnDamageNumber(killer.x, killer.y - killer.radius, '✨ +10 HP', '#88ff88');
    addBattleLog('heal', { attacker: getBallLabel(killer), aColor: killer.color, heal: 10, hpAfter: +killer.hp.toFixed(1), source: 'Soul Harvest' });
    if (typeof flashSkillHUD === 'function') flashSkillHUD(killer, SKILL_MAP['soul_harvest']);
  }

  // Momentum: +10% speed per kill (FFA only, max 5 stacks)
  if (killer.skills?.includes('momentum') && killer.teamId < 0) {
    const stacks = killer.skillState.momentumStacks || 0;
    if (stacks < 5) {
      killer.skillState.momentumStacks = stacks + 1;
      killer.maxSpd = killer.baseMaxSpd * (1 + killer.skillState.momentumStacks * 0.10);
      spawnDamageNumber(
        killer.x, killer.y - killer.radius - 16,
        `MOMENTUM ×${killer.skillState.momentumStacks}`, '#00ddff'
      );
      flashSkillHUD(killer, SKILL_MAP['momentum']);
    }
  }
}

// ─── skillOnPostCombat ───────────────────────────────────────
// Hook chạy sau khi round kết thúc, cho mỗi player (gọi từ showResult()).
// fighter = state.fighters[i] — object tồn tại xuyên suốt các round BO3/tournament,
// dùng để lưu cross-round bonus (learningBonus, veteranStats, adaptResist...).
// Xử lý loser skills: Learning, Adaptation, Blood Mark.
// Xử lý winner skills: Survivor, Veteran, Mastery, Perfectionist, Copycat.
// Tham số: ball (Ball), won (bool) — true nếu ball thắng round này
//          fighter (object) — dữ liệu fighter xuyên round
// Trả về: không có
function skillOnPostCombat(ball, won, fighter) {
  // JoJo Evolution: track after each win
  if (typeof jojoOnPostCombat === 'function') jojoOnPostCombat(ball, won);
  // One Piece: reset per-round flags (obs evade, neko, tori)
  if (typeof opOnPostCombat === 'function') opOnPostCombat(ball, won);

  if (!ball.skills || ball.skills.length === 0) return;

  // ── LOSER skills ───────────────────────────────────────
  if (!won) {
    // Learning: +5% damage multiplier next round
    if (ball.skills.includes('learning')) {
      fighter.learningBonus = (fighter.learningBonus || 0) + 0.05;
      spawnDamageNumber(ball.x, ball.y - ball.radius, 'LEARNING +5%', '#88aaff');
      flashSkillHUD(ball, SKILL_MAP['learning']);
      if (state?.championship && typeof csAddHistoryChange === 'function')
        csAddHistoryChange(fighter, '+5% DMG stack (Learning)');
    }

    // Adaptation: 20% resistance to the weapon that killed you
    if (ball.skills.includes('adaptation') && ball._killedBy?.weaponDef) {
      fighter.adaptResist = ball._killedBy.weaponDef.id;
      flashSkillHUD(ball, SKILL_MAP['adaptation']);
    }

    // Blood Mark: debuff opponents — next round they start with 80% HP
    if (ball.skills.includes('blood_mark')) {
      const ballIdx = state.players.indexOf(ball);
      state.players.forEach((other, j) => {
        if (j === ballIdx) return;
        const otherFi = state.fighters[j];
        if (!otherFi) return;
        const isOpponent = ball.teamId < 0 || ball.teamId !== other.teamId;
        if (isOpponent) {
          otherFi.bloodMarked = true;
          spawnDamageNumber(ball.x, ball.y - ball.radius - 14, '🩸 BLOOD MARK!', '#cc0000');
          flashSkillHUD(ball, SKILL_MAP['blood_mark']);
        }
      });
    }
  }

  // ── WINNER skills ──────────────────────────────────────
  if (won) {
    const hpPct = ball.hp / ball.maxHp;

    // Survivor: win with < 20% HP → +10 max HP permanently
    if (ball.skills.includes('survivor') && hpPct < 0.20) {
      fighter.survivorHPBonus = (fighter.survivorHPBonus || 0) + 10;
      spawnDamageNumber(ball.x, ball.y - ball.radius - 14, '🩹 +10 MAX HP!', '#ff6688');
      flashSkillHUD(ball, SKILL_MAP['survivor']);
      if (state?.championship && typeof csAddHistoryChange === 'function')
        csAddHistoryChange(fighter, '+10 Max HP (Survivor)');
    }

    // Veteran: win → +1 random stat (no cap)
    if (ball.skills.includes('veteran')) {
      const stats = ['STR', 'SPD', 'IQ', 'BIQ', 'MA'];
      const chosen = stats[Math.floor(Math.random() * stats.length)];
      fighter.veteranStats = fighter.veteranStats || {};
      fighter.veteranStats[chosen] = (fighter.veteranStats[chosen] || 0) + 1;
      spawnDamageNumber(ball.x, ball.y - ball.radius - 14, `🏅 +1 ${chosen}!`, '#ffcc44');
      flashSkillHUD(ball, SKILL_MAP['veteran']);
    }

    // Mastery: win with < 50% HP → MA×3% chance +1 dmg (melee) or +1 proj start (ranged)
    if (ball.skills.includes('mastery') && hpPct < 0.50) {
      const chance = (ball.charMA ?? 5) * 0.03;
      if (Math.random() < chance) {
        const isRanged = ball.weaponDef?.aiType === 'ranged';
        if (isRanged) {
          fighter.masteryProjBonus = (fighter.masteryProjBonus || 0) + 1;
          spawnDamageNumber(ball.x, ball.y - ball.radius - 14, '🌙 +1 PROJ!', '#cc88ff');
        } else {
          fighter.masteryDmgBonus = (fighter.masteryDmgBonus || 0) + 1;
          spawnDamageNumber(ball.x, ball.y - ball.radius - 14, '🌙 +1 DMG!', '#cc88ff');
        }
        flashSkillHUD(ball, SKILL_MAP['mastery']);
      }
    }

    // Perfectionist: >80% HP → next round +15% dmg; ≤80% HP → -10% dmg
    if (ball.skills.includes('perfectionist')) {
      fighter.perfMult = hpPct > 0.80 ? 1.15 : 0.90;
      const label = hpPct > 0.80 ? '💎 PERFECT +15%!' : '💎 NOT PERF -10%';
      const col   = hpPct > 0.80 ? '#aaffcc' : '#ff8866';
      spawnDamageNumber(ball.x, ball.y - ball.radius - 14, label, col);
      flashSkillHUD(ball, SKILL_MAP['perfectionist']);
    }

    // Copycat: BIQ×3.5% chance to học 1 skill ngẫu nhiên từ đối thủ
    // Belphegor (Sloth): quá lười — không bao giờ học được gì cả
    const _belphegorBlock = ball.charRace === 'demon' && ball.charSubrace?.label === 'Belphegor';
    if (ball.skills.includes('copycat') && !_belphegorBlock) {
      const chance = (ball.charBIQ ?? 5) * 0.035;
      const candidateSkills = [...new Set(
        state.players.flatMap(other => {
          if (other === ball) return [];
          const isOpponent = ball.teamId < 0 || ball.teamId !== other.teamId;
          if (!isOpponent || !other.skills) return [];
          return other.skills.filter(sid => !ball.skills.includes(sid));
        })
      )];
      if (candidateSkills.length > 0) {
        const success = Math.random() < chance;
        const learned = success
          ? candidateSkills[Math.floor(Math.random() * candidateSkills.length)]
          : null;
        const inTournament = state.tournament || state.tournament2v2 || state.championship;
        if (inTournament) {
          // Store for Copycat Wheel — applied after wheel spin
          fighter._copycatWheel = { candidates: candidateSkills, result: learned };
          if (learned && state?.championship && typeof csAddHistoryChange === 'function') {
            const skName = (typeof SKILL_MAP !== 'undefined' && SKILL_MAP[learned])
              ? SKILL_MAP[learned].name : learned;
            csAddHistoryChange(fighter, `+${skName} (Copycat)`);
          }
        } else if (learned) {
          // Non-tournament: apply directly
          fighter.copycatSkill = learned;
          spawnDamageNumber(ball.x, ball.y - ball.radius - 14, '🎭 COPYCAT!', '#ffaaff');
          flashSkillHUD(ball, SKILL_MAP['copycat']);
        }
      }
    }
  }
}

// ─── skillOnTakeDamage ───────────────────────────────────────
// Hook chạy khi ball nhận đòn (gọi từ ball.takeDamage(), trước khi HP giảm).
// Hiện tại chỉ xử lý Bone Wall: tán 5 mảnh xương ra xung quanh khi bị đánh.
// Tham số: ball (Ball) — người nhận đòn
//          attacker (Ball) — người tấn công
//          dmg (number) — dame sắp nhận
// Trả về: không có
function skillOnTakeDamage(ball, attacker, dmg) {
  // Bone Wall: tán 5 bone shard ra 5 hướng đều nhau khi bị đánh
  // Damage mỗi mảnh = STR × 1.2, tồn tại 1.5s (90f)
  if (ball.skills?.includes('bone_wall') && typeof state !== 'undefined') {
    const str = ball.charSTR ?? 5;
    const shardDmg = str * 1.2;
    for (let i = 0; i < 5; i++) {
      const a   = (i / 5) * Math.PI * 2 + Math.random() * 0.4;
      const spd = 7 + Math.random() * 3;
      const sh  = new Projectile(ball.x, ball.y, Math.cos(a)*spd, Math.sin(a)*spd,
                    ball, 'bone_shard_proj', shardDmg);
      sh.immuneFrames = 3;
      sh.lifetimer    = 90; // 1.5s
      state.projectiles.push(sh);
    }
    if (typeof flashSkillHUD === 'function') flashSkillHUD(ball, SKILL_MAP['bone_wall']);
  }
}

// ─── skillPerFrameUpdate ─────────────────────────────────────
// Chạy mỗi frame cho mỗi ball sống (gọi từ game-loop step()).
// Xử lý các timer giảm dần: War Banner countdown, Horde Call timer,
// Plague tick damage.
// Tham số: ball (Ball)
// Trả về: không có
function skillPerFrameUpdate(ball) {
  const sk = ball.skillState;
  if (!sk) return;

  // War Banner: decay timer each frame
  if (sk.warBannerActive && sk.warBannerTimer > 0) {
    sk.warBannerTimer--;
    if (sk.warBannerTimer === 0) {
      sk.warBannerActive = false;
      spawnDamageNumber(ball.x, ball.y - ball.radius - 14, '🚩 Banner ended', '#998866');
    }
  }

  // Horde Call: spawn 3 minions every 15s
  if (ball.skills?.includes('horde_call') && typeof state !== 'undefined') {
    sk.hordeTimer = (sk.hordeTimer || 0) + 1;
    if (sk.hordeTimer >= 1500) {
      sk.hordeTimer = 0;
      _spawnSkillMinions(ball, 'skeleton', 3);
      spawnDamageNumber(ball.x, ball.y - ball.radius - 20, '⚔️ HORDE!', '#ffaa44');
      if (typeof flashSkillHUD === 'function') flashSkillHUD(ball, SKILL_MAP['horde_call']);
    }
  }

  // Plague Bearer: nhận tick damage nếu ball đang bị Plague
  // Mỗi 120f (2s) = 1 tick → dame = 2 × số stack (max 3 stack)
  if (ball._plagueTimer > 0) {
    ball._plagueTimer--;
    ball._plagueTick = (ball._plagueTick || 0) + 1;
    if (ball._plagueTick >= 120) { // tick mỗi 2s
      ball._plagueTick = 0;
      const dmgTick = 2 * (ball._plagueStacks || 1);
      ball.hp = Math.max(0, ball.hp - dmgTick);
      spawnDamageNumber(ball.x, ball.y - ball.radius - 12, `🦠 -${dmgTick}`, '#44cc44');
      if (ball.hp <= 0 && ball.alive) {
        ball.alive = false;
        if (ball._plagueOwner) skillOnKill(ball._plagueOwner, ball);
      }
    }
    if (ball._plagueTimer <= 0) {
      ball._plagueStacks = 0;
      ball._plagueOwner  = null;
    }
  }
}

// ─── _spawnSkillMinions ──────────────────────────────────────
// Spawn một số lượng minion cho skill như Necromancer's Pact hoặc Horde Call.
// Minion là object đơn giản (không phải Ball class) — di chuyển về phía enemy gần nhất,
// tấn công melee, nhận dame từ projectile, tự chết sau lifetime hết.
// Tham số: owner (Ball), type ('skeleton'|'soul'), count (number)
// Trả về: không có — push vào state.skillMinions[]
function _spawnSkillMinions(owner, type, count) {
  if (typeof state === 'undefined') return;
  state.skillMinions = state.skillMinions || [];
  const str        = owner.charSTR ?? 5;
  const isSummoner = owner.charDevs?.includes('summoner');
  for (let i = 0; i < count; i++) {
    const a   = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const off = 30 + Math.random() * 20;
    // Base lifetime 15s (900f); Summoner ×1.5 → 22.5s (1350f)
    const lifetime = isSummoner ? 1350 : 900;
    state.skillMinions.push({
      x:         owner.x + Math.cos(a) * off,
      y:         owner.y + Math.sin(a) * off,
      vx: 0, vy: 0,
      hp:        type === 'skeleton' ? 20 : 30,
      maxHp:     type === 'skeleton' ? 20 : 30,
      r:         type === 'skeleton' ? 15  : 18,
      // Skeleton onehit trừ khi owner là Summoner
      killOnHit: type === 'skeleton' && !isSummoner,
      color:     type === 'skeleton' ? '#aaffaa' : '#88ccff',
      owner,
      teamId:      owner.teamId,
      damage:      str * 0.8,
      attackRange: 32,
      attackCd:    0,
      attackCdMax: 70,
      alive:    true,
      type,
      lifetime,
      _age:     0,
    });
  }
}

// ─── _spawnMirrorClone ───────────────────────────────────────
// Spawn một Ball "bản sao" với 50% stats của owner (Mirror Clone skill).
// Clone là Ball thật, chiến đấu độc lập nhưng KHÔNG tính vào điều kiện thắng.
// Skills = [] (không có skill), có isMirrorClone = true để loại khỏi win check.
// Tham số: owner (Ball)
// Trả về: không có — push clone vào state.players[]
function _spawnMirrorClone(owner) {
  if (typeof state === 'undefined' || typeof Ball === 'undefined') return;
  // Tạo charStats với 50% mỗi stat của owner (làm tròn xuống)
  const cs = {
    strength: Math.round((owner.charSTR ?? 5) * 0.5),
    speed:    Math.round((owner.charSPD ?? 5) * 0.5),
    durability: Math.round((owner.charDUR ?? 5) * 0.5),
    iq:       Math.round((owner.charIQ  ?? 5) * 0.5),
    battleiq: Math.round((owner.charBIQ ?? 5) * 0.5),
    ma:       Math.round((owner.charMA  ?? 5) * 0.5),
  };
  const clone = new Ball(
    owner.x + (Math.random() - 0.5) * 40,
    owner.y + (Math.random() - 0.5) * 40,
    owner.color,
    owner.weaponDef?.id || 'fists',
    owner.side || 'left',
    cs,
    owner.teamId
  );
  clone.isMirrorClone   = true;
  clone.mirrorCloneOwner = owner;
  clone.charName  = `[Clone] ${owner.charName || '?'}`;
  clone.charEmoji = owner.charEmoji || '';
  clone.skills    = [];
  initRoundSkillState(clone);
  state.players.push(clone);
}

// ─── updateSkillMinions ──────────────────────────────────────
// Cập nhật mỗi frame cho tất cả minion trong state.skillMinions[].
// Logic: tìm enemy gần nhất → di chuyển về phía đó → tấn công khi đủ gần.
// Minion bị xóa khi: hp ≤ 0, lifetime hết, hoặc bị projectile trúng.
// Tham số: không có (đọc state.skillMinions)
// Trả về: không có
function updateSkillMinions() {
  if (!state.skillMinions?.length) return;
  for (let i = state.skillMinions.length - 1; i >= 0; i--) {
    const m = state.skillMinions[i];
    if (!m.alive) { state.skillMinions.splice(i, 1); continue; }
    m._age++;
    if (m.lifetime > 0 && m._age >= m.lifetime) { m.alive = false; continue; }

    // Find nearest enemy player
    let nearest = null, nearestD = Infinity;
    for (const p of state.players) {
      if (!p.alive || p === m.owner || p.isMirrorClone) continue;
      if (m.teamId >= 0 && p.teamId === m.teamId) continue;
      const d = Math.hypot(p.x - m.x, p.y - m.y);
      if (d < nearestD) { nearestD = d; nearest = p; }
    }

    if (nearest) {
      const dx = nearest.x - m.x, dy = nearest.y - m.y;
      const d  = Math.hypot(dx, dy) || 1;
      m.vx += (dx / d) * 0.35;
      m.vy += (dy / d) * 0.35;
      const spd = Math.hypot(m.vx, m.vy);
      if (spd > 2.5) { m.vx = m.vx / spd * 2.5; m.vy = m.vy / spd * 2.5; }

      // Melee attack when close enough
      m.attackCd = Math.max(0, m.attackCd - 1);
      if (nearestD < m.r + (nearest.radius || 16) + 4 && m.attackCd === 0) {
        m.attackCd = m.attackCdMax;
        if (nearest.takeDamage) nearest.takeDamage(m.damage, m.x, m.y, false, null, false, false);
        // Shikigami: biến mất sau 2 đòn đánh trúng
        if (m.hitsDealt !== undefined) {
          m.hitsDealt++;
          if (m.hitsDealt >= 2) { m.alive = false; continue; }
        }
      }
    } else {
      m.attackCd = Math.max(0, m.attackCd - 1);
    }

    m.x += m.vx;
    m.y += m.vy;
    m.vx *= 0.80;
    m.vy *= 0.80;

    // Simple arena boundary bounce
    if (typeof checkArenaWall === 'function' && state.arena) {
      const hit = checkArenaWall(m.x, m.y, m.r, state.arena, false);
      if (hit) {
        if (hit.nx !== 0) { m.vx *= -0.5; m.x += hit.nx * 2; }
        if (hit.ny !== 0) { m.vy *= -0.5; m.y += hit.ny * 2; }
      }
    }

    // Take damage from projectiles
    for (let j = state.projectiles.length - 1; j >= 0; j--) {
      const proj = state.projectiles[j];
      if (!proj.alive || proj.immuneFrames > 0) continue;
      if (proj.owner === m.owner) continue;
      if (m.teamId >= 0 && proj.owner?.teamId === m.teamId) continue;
      if (Math.hypot(proj.x - m.x, proj.y - m.y) < m.r + proj.r) {
        m.hp -= proj.damage;
        if (!proj.piercing) proj.alive = false;
        // Shikigami: 1 hit = biến mất
        if (m.killOnHit || m.hp <= 0) { m.alive = false; break; }
      }
    }
  }
}

// ─── drawSkillMinions ────────────────────────────────────────
// Render tất cả minion lên canvas: hình tròn màu + HP bar.
// Opacity nhấp nháy khi HP < 35% (báo hiệu sắp chết).
// Tham số: ctx (CanvasRenderingContext2D)
// Trả về: không có
function drawSkillMinions(ctx) {
  if (!state.skillMinions?.length) return;
  for (const m of state.skillMinions) {
    if (!m.alive) continue;
    ctx.save();
    // Pulsing opacity near death
    const hpFrac = m.hp / m.maxHp;
    ctx.globalAlpha = hpFrac < 0.35 ? 0.5 + 0.35 * Math.sin(Date.now() * 0.015) : 0.88;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fillStyle   = m.color;
    ctx.shadowColor = m.color;
    ctx.shadowBlur  = 6;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.shadowBlur  = 0;
    ctx.globalAlpha = 1;
    // HP bar
    const bw = m.r * 2.2, bh = 3;
    const bx = m.x - bw / 2, by = m.y - m.r - 6;
    ctx.fillStyle = '#333'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = hpFrac > 0.5 ? '#44ff88' : hpFrac > 0.25 ? '#ffcc44' : '#ff4444';
    ctx.fillRect(bx, by, bw * hpFrac, bh);
    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════════════════
// RACE SKILLS — unique active abilities, auto-assigned by race
// ═══════════════════════════════════════════════════════════════════
// Mỗi race có 1 race skill đặc trưng, được gán tự động qua initRaceSkillState().
// Race skill KHÔNG nằm trong SKILL_DEFS — chúng hoạt động qua hệ thống riêng:
//   ball.raceSkillDef → object định nghĩa (id, name, icon, desc)
//   ball.rs_*         → tất cả state: cooldown, timer, stacks, flags…
// updateRaceSkills() xử lý logic frame-by-frame cho từng race.
// drawRaceSkillEffects() render hiệu ứng visual trên canvas.

const RACE_SKILL_DEFS = {
  dragon:     { id:'race_flame_breath', name:'Flame Breath', icon:'🔥',
                desc:'Unleashes a wide fire cone that burns nearby enemies. Damage scales with STR, cone width with MA. Recharges faster with higher SPD.' },
  troll:      { id:'race_net_throw',    name:'Net Throw',    icon:'🕸️',
                desc:'Throws a net that traps the nearest enemy in place. Trap lasts longer with higher BIQ. Recharges faster with higher SPD.' },
  primordial: { id:'race_void_grip',    name:'Void Grip',    icon:'🌌',
                desc:'When struck by a melee weapon, it may get stuck — freezing the attacker\'s weapon temporarily. More likely with high BIQ, lasts longer with high MA.' },
  human:      { id:'race_limit_break',  name:'Limit Break',  icon:'⚡',
                desc:'Triggers once when HP drops below 20%. From that point on, each hit you land permanently stacks up your damage for the rest of the match.' },
  angel:      { id:'race_smite',        name:'Smite',        icon:'✨',
                desc:'Periodically calls down lightning on the nearest enemy, dealing damage and stunning them. Scales with IQ and MA.' },
  dwarf:      { id:'race_master_forge', name:'FORGE!',       icon:'⚒️',
                desc:'Every few seconds, your weapon gets a random upgrade — sharper, harder-hitting, or faster-firing. Upgrades carry over between rounds. Forges faster with higher DUR.' },
  orc:        { id:'race_blood_price',  name:'Blood Price',  icon:'🩸',
                desc:'Each hit you take builds Bloodlust, up to 5 stacks. At 5 stacks, your next attack deals burst damage and heals you. Damage scales with STR, healing with DUR.' },
  giant:      { id:'race_quake',        name:'Quake',        icon:'🌍',
                desc:'Periodically slams the ground, pushing all enemies away with a shockwave. Enemies caught close also take damage. Power scales with STR, recharges faster with DUR.' },
  god:        { id:'race_god_gift',     name:'God Gift',     icon:'✨',
                desc:'Unique passive based on your blessing. Surtr: ground slam at 70s. Raijin: gain speed with each wall bounce. Shiva: switch to pure fists at 70s. Atlas: regenerate HP every 1.5s (scales with DUR). Thoth/Athena: bonuses applied at character creation.',
                descBySubrace: {
                  'Blessed by Surtr':  '✊ At 70s — Divine Slam: knockback all enemies, deal STR-based damage to those within 160px, clear all traps from the arena.',
                  'Blessed by Raijin': '⚡ Each wall bounce: +1 speed stack. At 10+ stacks: projectile evasion 50–95% (scales with stack count).',
                  'Blessed by Shiva':  '🥋 At 70s — Martial God: discard weapon, switch to pure Fists with enhanced MA scaling. Fists can deflect projectiles without taking damage.',
                  'Blessed by Atlas':  '🛡️ Passive regen every 1.5s: DUR × 0.05 HP/tick (min 0.5 HP). Scales strongly with DUR.',
                  'Blessed by Thoth':  '📚 Bonus IQ at creation (guaranteed ≥10, ×2 if rolled max). Grants extra skills based on IQ — no skill wheel.',
                  'Blessed by Athena': '⚔️ Bonus BIQ at creation (guaranteed ≥10, ×2 if rolled max). Weapon Mastery — can equip any weapon regardless of race restriction.',
                } },
  skeleton:   { id:'race_bone_scatter',   name:'Bone Scatter',  icon:'🦴',
                desc:'Passive: 50% chance on each hit to scatter bone shards (1 shard per 4 BIQ, min 1). Pick up own shards to heal (DUR×1.5 HP each) and gain a speed burst. Enemy contact destroys shards.' },
  demon:      { id:'race_blood_contract', name:'Blood Contract', icon:'📜',
                desc:'Sacrifice 15% current HP to activate a dark pact (5–7s). While active: every hit you receive also heals you for 50% of the damage dealt. Scale DUR (+absorb%), MA (duration + faster cooldown). Cooldown ~25s.' },
};

function getRaceSkillDef(race) { return RACE_SKILL_DEFS[race] ?? null; }

// ─── initRaceSkillState ──────────────────────────────────────
// Khởi tạo tất cả biến rs_* trên ball dựa theo race.
// Gọi từ setup.js sau Ball constructor, trước khi round bắt đầu.
// Mỗi race tính các thông số từ stats (STR, SPD, MA, BIQ, DUR):
//   rs_maxCooldown → số frame giữa hai lần dùng skill
//   rs_cooldown    → đếm ngược hiện tại (bắt đầu = maxCooldown = đã full cooldown)
//   rs_active      → true khi skill đang trong phase hoạt động
//   rs_timer       → frame countdown cho phase active
//   rs_duration    → tổng frame active mỗi lần kích hoạt
// Tham số: ball (Ball)
// Trả về: không có
function initRaceSkillState(ball) {
  const race = ball.charRace;
  ball.raceSkillDef = RACE_SKILL_DEFS[race] ?? null;
  if (!ball.raceSkillDef) return;
  const spd = ball.charSPD ?? 5;
  const str = ball.charSTR ?? 5;
  const ma  = ball.charMA  ?? 5;
  const biq = ball.charBIQ ?? 5;
  const iq  = ball.charIQ  ?? 5;

  if (race === 'dragon') {
    ball.rs_maxCooldown = Math.max(600, 1800 - spd * 40);
    ball.rs_cooldown    = ball.rs_maxCooldown;            // start on full cooldown
    ball.rs_active      = false;
    ball.rs_timer       = 0;
    ball.rs_duration    = Math.round((120 + ma * 12) * 1.12); // +12% duration
    ball.rs_dmgPerFrame = 0.05 + str * 0.02;
    ball.rs_halfCone    = Math.PI / 6 + ma * 0.012;      // wider with MA
    // Sweep: amplitude ±35°(MA1) → ±50°(MA10), freq scales with IQ
    ball.rs_sweepAmp    = (35 + ma * 1.5) * (Math.PI / 180);
    ball.rs_sweepFreq   = 0.045 + iq * 0.003;            // IQ1→~2.2s/cycle, IQ10→~1.4s/cycle
    ball.rs_sweepBase   = 0;                              // locked at activation
  }
  if (race === 'troll') {
    // Cooldown: SPD=5→600f(10s), SPD=10→360f(6s) — floor 360f
    ball.rs_maxCooldown = Math.max(360, 840 - spd * 48);
    ball.rs_cooldown    = ball.rs_maxCooldown; // start on full cooldown
    // Trap duration: BIQ=5→120f(2s), BIQ=10→210f(3.5s) — floor 60f
    ball.rs_trapDur     = Math.max(60, 30 + biq * 18);
  }
  if (race === 'primordial') {
    ball.rs_stuckChance = Math.min(0.60, biq * 0.06);
    ball.rs_stuckDur    = 60 + ma * 15;
    ball.rs_maxCooldown = 0; // passive — no cooldown bar
  }
  if (race === 'human') {
    // Threshold trigger: fires once when HP < 20%, lasts 8s then exhausted
    ball.rs_active         = false;
    ball.rs_triggered      = false;  // one-time flag — can never re-trigger
    ball.rs_stacks         = 0;
    ball.rs_maxCooldown    = 0;      // no cooldown bar; HP-threshold based
    ball.rs_lbBackoffTimer = 0;      // frames remaining in post-hit backoff phase
    ball.rs_lbTimer        = 0;      // frames remaining in LB duration (480 = 8s)
    ball.rs_lbDrainTimer   = 0;      // countdown to next 1 HP drain tick (120 = 2s)
    ball.rs_lbExhausted    = false;  // true after LB ends — weapon 30% slower
  }
  if (race === 'angel') {
    ball.rs_maxCooldown = Math.max(600, 900 - spd * 40);
    ball.rs_cooldown    = ball.rs_maxCooldown; // start on full cooldown
    ball.rs_smiteDmg    = Math.round((8 + iq * 2) * 0.7); // −30%
    ball.rs_smiteStun   = 60 + ma * 12;
  }
  if (race === 'orc') {
    ball.rs_stacks     = 0;       // bloodlust stacks (0–5)
    ball.rs_burstReady = false;   // true when 5 stacks reached
    ball.rs_maxCooldown = 0;      // passive — no cooldown bar
  }
  if (race === 'giant') {
    // Cooldown: STR5,DUR5→1400f(~23s); STR10,DUR10→1200f(20s)
    ball.rs_maxCooldown  = Math.max(1200, 1800 - str * 50 - (ball.charDUR ?? 5) * 30);
    ball.rs_cooldown     = ball.rs_maxCooldown; // starts on full cooldown
    ball.rs_quakeForce   = 6 + str * 1.5;      // STR5→13.5, STR10→21
    ball.rs_quakeDmg     = Math.round(str * 2 * 0.7); // close-range damage (−30%)
    ball.rs_quakeActive  = false;
    ball.rs_quakeTimer   = 0;
    ball.rs_quakeWaveR   = 0;
  }
  if (race === 'dwarf') {
    // Forge interval: DUR5→600f(10s), DUR10→480f(8s)
    ball.rs_maxCooldown       = Math.max(420, 720 - (ball.charDUR ?? 5) * 24);
    ball.rs_cooldown          = ball.rs_maxCooldown; // start counting down immediately
    ball.rs_forgeLevel        = 0;   // total upgrades across rounds
    ball.rs_forgeSizeBonus    = 0;   // melee: extra hit threshold radius
    ball.rs_forgeParryBonus   = 0;   // melee: extra parry detection radius
    ball.rs_forgeSharpness    = 0;   // both: +5% dmg per stack
    ball.rs_forgeProjSizeBonus  = 0; // ranged: extra projectile radius
    ball.rs_forgeProjSpeedBonus = 0; // ranged: extra projectile speed
    ball.rs_forgeFlash        = 0;   // visual flash timer after each forge
  }
  if (race === 'god') {
    const srLabel = ball.charSubrace?.label || '';
    ball.rs_god70done   = false;   // one-shot 70s trigger flag
    ball.rs_maxCooldown = 0;       // no cooldown arc (time-based, not cooldown-based)
    // Blessed by Surtr
    if (srLabel === 'Blessed by Surtr') {
      ball.rs_godForce   = 5 + str * 1.5;       // STR10→20, STR20→35
      ball.rs_godDmg     = Math.round(str * 2); // STR10→20, STR20→40
      ball.rs_slamActive = false;
      ball.rs_slamTimer  = 0;
      ball.rs_slamWaveR  = 0;
    }
    // Blessed by Raijin
    if (srLabel === 'Blessed by Raijin') {
      ball.rs_speedStacks = 0;       // bounce stacks since last hit/parry
    }
    // Blessed by Shiva
    if (srLabel === 'Blessed by Shiva') {
      ball.rs_maTransformed = false; // true after 70s weapon swap
    }
    // Blessed by Atlas: Soul of Stone — passive HP regen every 90 frames (1.5s)
    if (srLabel === 'Blessed by Atlas') {
      ball.rs_durRegenTimer = 0;     // counts frames toward next regen tick
    }
    // Blessed by Thoth + Blessed by Athena: no runtime state needed in battle
  }
  if (race === 'skeleton') {
    ball.rs_maxCooldown     = 0;   // hoàn toàn passive — không có cooldown bar
    // rs_shardHeal: HP hồi khi nhặt được mảnh xương (mỗi lần nhặt = 1 mảnh)
    ball.rs_shardHeal       = (ball.charDUR ?? 5) * 1.5;       // DUR=5→7.5 HP, DUR=10→15 HP
    // rs_shardCount: số mảnh xương rơi ra mỗi lần bị đánh trúng
    ball.rs_shardCount      = Math.max(1, Math.floor((ball.charBIQ ?? 5) / 4)); // BIQ=4→1, BIQ=8→2
    ball.rs_shardSpeedMult  = 1.30;  // nhặt xương → speed cap tăng 30% trong 3s
    ball.rs_shardSpeedDur   = 180;   // 3s = 180f, cộng dồn khi nhặt nhiều xương liên tiếp
    ball.rs_shardSpeedTimer = 0;
    ball.rs_boneDropCd      = 0;     // cooldown giữa mỗi lần drop xương (tránh spam từ bow/shuriken)
  }
  if (race === 'demon') {
    const dur = ball.charDUR ?? 5;
    // Cooldown: MA=5→1500f(25s), MA=10→1200f(20s), floor 900f(15s)
    ball.rs_maxCooldown = Math.max(900, 1800 - ma * 60);
    ball.rs_cooldown    = ball.rs_maxCooldown;
    ball.rs_active      = false;
    ball.rs_timer       = 0;
    // Duration: MA=5→330f(5.5s), MA=10→420f(7s)
    ball.rs_duration    = Math.round(240 + ma * 18);
    // Absorb: DUR=5→65%, DUR=10→80%, cap 85%
    ball.rs_absorbPct   = Math.min(0.85, 0.50 + dur * 0.03);
  }
}

// ─── updateVoidGripPhysics ───────────────────────────────────
// Xử lý vật lý "weapon bị kẹt" của Void Grip (Primordial race skill).
// Chạy mỗi frame cho TẤT CẢ ball sống (không chỉ Primordial) vì bất kỳ
// ball nào cũng có thể bị Void Grip bắt vũ khí kẹt.
// Khi bị kẹt (rs_weaponStuck > 0):
//   - Ball bị ghim vào vị trí cố định, vx/vy = 0
//   - Vũ khí luôn chỉ về phía điểm kẹt
//   - Không thể gây dame (weapon cooldown bị force full)
// Khi hết timer hoặc Primordial chết → release + impulse ngẫu nhiên.
// Tham số: ball (Ball)
// Trả về: không có
function updateVoidGripPhysics(ball) {
  if (!ball.alive || !(ball.rs_weaponStuck > 0)) return;

  ball.rs_weaponStuck--;
  const tgt = ball.rs_stuckTarget;

  if (tgt && tgt.alive) {
    // Prevent stuck attacker from dealing damage — keep weapon on permanent cooldown
    ball.weapon.cooldown = ball.weapon.attackCooldown || 30;

    // World position of the stuck point (moves rigidly with Primordial)
    const wpx = tgt.x + ball.rs_stuckLocalX;
    const wpy = tgt.y + ball.rs_stuckLocalY;

    // Lock attacker position: stay at weaponLength from stuck point, original direction
    ball.x = wpx + Math.cos(ball.rs_stuckBallAngle) * ball.rs_stuckWeaponLen;
    ball.y = wpy + Math.sin(ball.rs_stuckBallAngle) * ball.rs_stuckWeaponLen;

    // Clamp stuck ball to arena bounds so it never gets dragged out-of-bounds
    if (state.arena) clampToBall(ball, state.arena);

    // Lock weapon angle to point from ball → stuck point (re-compute after clamp)
    ball.weapon.angle = Math.atan2(wpy - ball.y, wpx - ball.x);

    // Zero attacker velocity (completely pinned — dragged by Primordial, not own physics)
    ball.vx = 0; ball.vy = 0;
  }

  // Release when timer expires OR Primordial died
  if (ball.rs_weaponStuck === 0 || !tgt?.alive) {
    ball.rs_weaponStuck = 0;
    if (ball.rs_savedMaxSpd != null) {
      ball.maxSpd = ball.rs_savedMaxSpd;
      ball.rs_savedMaxSpd = null;
    }
    ball.rs_stuckTarget = null;
    // Launch-away impulse on release so it doesn't just freeze in place
    const ang = Math.random() * Math.PI * 2;
    ball.vx = Math.cos(ang) * 4;
    ball.vy = Math.sin(ang) * 4;
  }
}

// ─── _dwarfForge ─────────────────────────────────────────────
// Áp dụng 1 nâng cấp ngẫu nhiên cho vũ khí Dwarf (kích hoạt khi cooldown = 0).
// Melee: Bigger Blade (hit radius +4), Sharpness (+5% dmg), Tempered Edge (parry radius +6).
// Ranged: Heavy Ammo (proj radius +2), Sharp Tip (+5% dmg), Swift Flight (proj speed +0.8),
//         Keen Eye (critChance +3%).
// Nâng cấp tích lũy xuyên round qua fighter.masteryDmgBonus / fighter.masteryProjBonus.
// Tham số: ball (Ball) — Dwarf cần được forge
// Trả về: không có
function _dwarfForge(ball) {
  const isRanged = ball.weaponDef?.aiType === 'ranged';
  let upgradeName, upgradeIcon;

  if (isRanged) {
    const roll = Math.random();
    if (roll < 0.25) {
      ball.rs_forgeProjSizeBonus = (ball.rs_forgeProjSizeBonus || 0) + 2;
      upgradeName = 'Heavy Ammo'; upgradeIcon = '🏹';
    } else if (roll < 0.50) {
      ball.rs_forgeSharpness = (ball.rs_forgeSharpness || 0) + 1;
      upgradeName = 'Sharp Tip'; upgradeIcon = '✨';
    } else if (roll < 0.75) {
      ball.rs_forgeProjSpeedBonus = (ball.rs_forgeProjSpeedBonus || 0) + 0.8;
      upgradeName = 'Swift Flight'; upgradeIcon = '💨';
    } else {
      ball.critChance = Math.min(0.85, (ball.critChance || 0) + 0.03);
      upgradeName = 'Keen Eye'; upgradeIcon = '🎯';
    }
  } else {
    const roll = Math.random();
    if (roll < 0.34) {
      ball.rs_forgeSizeBonus = (ball.rs_forgeSizeBonus || 0) + 4;
      upgradeName = 'Bigger Blade'; upgradeIcon = '⚔️';
    } else if (roll < 0.67) {
      ball.rs_forgeSharpness = (ball.rs_forgeSharpness || 0) + 1;
      upgradeName = 'Sharpness'; upgradeIcon = '✨';
    } else {
      ball.rs_forgeParryBonus = (ball.rs_forgeParryBonus || 0) + 6;
      upgradeName = 'Tempered Edge'; upgradeIcon = '🛡️';
    }
  }

  ball.rs_forgeLevel = (ball.rs_forgeLevel || 0) + 1;
  ball.rs_forgeFlash = 55;
  spawnDamageNumber(ball.x, ball.y - ball.radius - 22,
    `${upgradeIcon} ${upgradeName}!`, '#f0c040');
  addBattleLog('race_skill', { attacker: getBallLabel(ball), aColor: ball.color,
    text: `⚒️ Forge Lv.${ball.rs_forgeLevel}: ${upgradeIcon} ${upgradeName}` });
}

// ─── updateRaceSkills ────────────────────────────────────────
// Logic frame-by-frame cho race skill của từng ball (gọi từ game-loop).
// Xử lý theo thứ tự:
//   1. Hiệu ứng tác động từ bên ngoài: netTrapped (Troll net), stunTimer
//   2. Early return nếu ball không có raceSkillDef
//   3. Cooldown tick chung: rs_cooldown--
//   4. Logic riêng mỗi race: Dragon flame, Troll net, Angel smite,
//      Orc bloodlust, Giant quake, Dwarf forge, Human LB movement,
//      God Surtr/Raijin/Shiva/Atlas, Skeleton shard speed, Demon Blood Contract
// Tham số: ball (Ball), players (Ball[]), rstate (state object)
// Trả về: không có
function updateRaceSkills(ball, players, rstate) {
  if (!ball.alive) return;
  const speedMul = (typeof state !== 'undefined' && state.speed > 0) ? state.speed : 1; // game speed multiplier

  // These effects can be applied to ANY ball by other races' skills — must run regardless of own raceSkillDef
  if (ball.netTrapped > 0) {
    // Decrement by state.speed so trap lasts the same real-time regardless of game speed
    ball.netTrapped = Math.max(0, ball.netTrapped - speedMul);
    // Cap speed to near-zero (don't multiply-to-zero — ball needs some residual velocity to escape when released)
    const netSpd = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (netSpd > 0.25) { ball.vx = ball.vx / netSpd * 0.25; ball.vy = ball.vy / netSpd * 0.25; }
    // Release impulse when trap just expired — ball has no AI steering so needs a kick to start moving
    if (ball.netTrapped === 0) {
      const ang = Math.random() * Math.PI * 2;
      const relSpd = (ball.maxSpd || 3) * 0.55;
      ball.vx = Math.cos(ang) * relSpd;
      ball.vy = Math.sin(ang) * relSpd;
    }
  }
  if (ball.stunTimer > 0) {
    ball.stunTimer--;
    // Parry stun expired → reverse weapon spin + set parryCooldown 10f
    if (ball.stunTimer === 0 && ball.parryStunReverse) {
      ball.parryStunReverse = false;
      // Parry Tech I already reversed spinDir instantly on parry — don't reverse again
      if (!ball.skills?.includes('parry_tech_1')) {
        ball.weapon.spinDir *= -1;
      }
      ball.weapon.parryCooldown = 10;
      // Reverse the toward-enemy velocity so balls separate cleanly (prevent deep body-bounce overlap)
      const stEnemy = players.filter(p => p !== ball && p.alive)
        .sort((a, b) => Math.hypot(a.x-ball.x, a.y-ball.y) - Math.hypot(b.x-ball.x, b.y-ball.y))[0];
      if (stEnemy) {
        const eDx = stEnemy.x - ball.x, eDy = stEnemy.y - ball.y;
        const eD  = Math.hypot(eDx, eDy) || 1;
        const eNx = eDx/eD, eNy = eDy/eD;
        const toward = ball.vx * eNx + ball.vy * eNy;
        if (toward > 0) { // moving toward enemy — flip that component
          ball.vx -= 2 * toward * eNx;
          ball.vy -= 2 * toward * eNy;
        }
      }
    }
  }

  if (!ball.raceSkillDef) return;
  const race = ball.charRace;

  // Tick race-specific cooldown
  if (ball.rs_cooldown > 0) ball.rs_cooldown--;

  // Tick Quake wall-slam window
  if (ball.quakeSlamFrames > 0) ball.quakeSlamFrames--;

  // Human Limit Break trigger is in takeDamage() (ball.js) — fires mid-frame when HP crosses 80%

  const enemies = players.filter(p => p !== ball && p.alive);
  if (!enemies.length) return;
  const nearest = enemies.reduce((a,b) =>
    Math.hypot(ball.x-a.x,ball.y-a.y) < Math.hypot(ball.x-b.x,ball.y-b.y) ? a : b);

  // ── DRAGON: Flame Breath ─────────────────────────────────────
  // Cooldown đủ → kích hoạt → rs_active = true → sweep flame mỗi frame
  // Flame Breath quét oscillate quanh hướng nhìn lúc kích hoạt (rs_sweepBase)
  if (race === 'dragon') {
    if (ball.rs_active) {
      ball.rs_timer--;
      ball.rs_flameTick = (ball.rs_flameTick || 0) + 1;
      // Góc quét: dao động sin quanh rs_sweepBase (hướng vũ khí lúc kích hoạt)
      // rs_sweepAmp = biên độ (±35°–50°), rs_sweepFreq = tần số (phụ thuộc IQ)
      const coneAng = ball.rs_sweepBase
        + Math.sin(ball.rs_flameTick * ball.rs_sweepFreq) * ball.rs_sweepAmp;
      const coneLen = 80 + ball.rs_duration * 0.25; // chiều dài ngọn lửa

      // Gây dame mỗi 20f (~0.33s/tick), dùng flameImmunity riêng (không block weapon hit)
      if (ball.rs_flameTick % 20 === 0) {
        const flameDmg = (ball.charSTR ?? 5) * 2.1;  // STR5 → 10.5/tick, STR10 → 21/tick (−30%)
        for (const en of enemies) {
          if (!en.alive) continue;
          if ((en.flameImmunity || 0) > 0) continue; // separate from weapon immunityFrames
          const dx = en.x - ball.x, dy = en.y - ball.y;
          if (Math.hypot(dx, dy) > coneLen + en.radius) continue;
          let diff = Math.atan2(dy, dx) - coneAng;
          while (diff >  Math.PI) diff -= 2 * Math.PI;
          while (diff < -Math.PI) diff += 2 * Math.PI;
          if (Math.abs(diff) < ball.rs_halfCone + 0.15) {
            en.hp = Math.max(0, en.hp - flameDmg);
            en.flameImmunity = 18;   // per-enemy, doesn't block regular weapon hits
            en.hitFlash = 6;
            ball.stats.damageDone += flameDmg;
            spawnDamageNumber(en.x, en.y - en.radius - 14, `-${flameDmg} 🔥`, '#ff8800');
            addBattleLog('hit', {
              attacker: getBallLabel(ball), aColor: ball.color,
              defender: getBallLabel(en),  dColor: en.color,
              damage: flameDmg, defHp: +Math.max(0, en.hp).toFixed(1), weapon: 'Flame Breath', isCrit: false
            });
            if (en.hp <= 0 && en.alive) { en.alive = false; skillOnKill(ball, en); }
          }
        }
      }
      // Tick down per-enemy flame immunity (separate from weapon immunityFrames)
      for (const en of enemies) {
        if ((en.flameImmunity || 0) > 0) en.flameImmunity--;
      }

      if (ball.rs_timer <= 0) {
        ball.rs_active    = false;
        ball.rs_flameTick = 0;
        ball.rs_cooldown  = ball.rs_maxCooldown;
      }
    } else if (ball.rs_cooldown === 0) {
      ball.rs_active    = true;
      ball.rs_timer     = ball.rs_duration;
      ball.rs_flameTick = 0;
      ball.rs_sweepBase = ball.weapon.angle; // lock facing direction at activation
      spawnDamageNumber(ball.x, ball.y - ball.radius - 22, '🔥 FLAME BREATH!', '#ff6600');
      addBattleLog('race_skill', { attacker: getBallLabel(ball), aColor: ball.color, text: '🔥 Flame Breath!' });
    }
  }

  // ── HUMAN: Limit Break duration drain + expiry ──────────────
  // Limit Break kích hoạt 1 lần duy nhất khi HP < 20% (trong takeDamage)
  // Trong 8s (480f): mỗi hit thêm stack → tăng dame; mất -1 HP mỗi 2s
  // Sau 8s: trạng thái "Exhausted" → weapon spinSpeed bị giảm 30%
  if (race === 'human' && ball.rs_active) {
    if (ball.rs_lbTimer > 0) {
      ball.rs_lbTimer--;
      // Drain -1 HP mỗi 2s (min 1 HP — không thể tự chết vì LB)
      ball.rs_lbDrainTimer--;
      if (ball.rs_lbDrainTimer <= 0) {
        ball.hp = Math.max(1, ball.hp - 1);
        ball.rs_lbDrainTimer = 120;
        if (typeof spawnDamageNumber === 'function')
          spawnDamageNumber(ball.x, ball.y - ball.radius - 10, '-1', '#ff6666');
      }
      // Duration expired → exhaustion debuff
      if (ball.rs_lbTimer === 0) {
        ball.rs_active     = false;
        ball.rs_lbExhausted = true;
        if (typeof spawnDamageNumber === 'function')
          spawnDamageNumber(ball.x, ball.y - ball.radius - 26, 'EXHAUSTED', '#888888');
        if (typeof ball.shout === 'function')
          ball.shout('Just little more...', 280, '#888888');
        if (typeof addBattleLog === 'function')
          addBattleLog('race_skill', { attacker: getBallLabel(ball), aColor: ball.color, text: '💀 Limit Break ended — exhausted!' });
      }
    }
  }

  // ── HUMAN: Limit Break AI movement (runs every frame while active) ──
  if (race === 'human' && ball.rs_active && nearest) {
    const dx   = nearest.x - ball.x;
    const dy   = nearest.y - ball.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx   = dx / dist;
    const ny   = dy / dist;
    // Dùng aiType để cover tất cả ranged (bow, shuriken, chakram, medusa_bow...)
    const isRanged = ball.weaponDef?.aiType === 'ranged';

    if (!isRanged) {
      // Decrement backoff timer
      if (ball.rs_lbBackoffTimer > 0) ball.rs_lbBackoffTimer--;

      if (ball.rs_lbBackoffTimer > 0) {
        // Backoff phase: dash AWAY from enemy after landing a hit
        ball.vx = -nx * ball.maxSpd * 1.8;
        ball.vy = -ny * ball.maxSpd * 1.8;
        // Soft-aim trong backoff
        const targetAngle = Math.atan2(dy, dx);
        let aimDiff = targetAngle - ball.weapon.angle;
        while (aimDiff >  Math.PI) aimDiff -= Math.PI * 2;
        while (aimDiff < -Math.PI) aimDiff += Math.PI * 2;
        ball.weapon.angle += Math.sign(aimDiff) * Math.min(Math.abs(aimDiff), 0.09);
      } else {
        // Charge phase: snap weapon thẳng vào enemy mỗi frame
        // (tránh behavior buồn cười: vũ khí chưa hướng đúng đã lao vào bị chém liên tục)
        ball.weapon.angle = Math.atan2(dy, dx);
        ball.vx = nx * ball.maxSpd * 2.5;
        ball.vy = ny * ball.maxSpd * 2.5;
      }
    } else {
      // Ranged (bow / shuriken / chakram / ...): kite at ideal 250px, snap aim on target
      const idealDist = 250, deadZone = 60;
      const kiteSpd   = ball.maxSpd * 1.2;
      let targetVx = 0, targetVy = 0;
      if (dist > idealDist + deadZone)       { targetVx =  nx * kiteSpd; targetVy =  ny * kiteSpd; }
      else if (dist < idealDist - deadZone)  { targetVx = -nx * kiteSpd; targetVy = -ny * kiteSpd; }
      ball.vx += (targetVx - ball.vx) * 0.07;
      ball.vy += (targetVy - ball.vy) * 0.07;
      ball.weapon.angle = Math.atan2(dy, dx);
    }
  }

  // ── GIANT: Quake ─────────────────────────────────────────────
  if (race === 'giant') {
    if (ball.rs_quakeTimer > 0) {
      ball.rs_quakeTimer--;
      ball.rs_quakeWaveR = (1 - ball.rs_quakeTimer / 30) * 360; // expand 0→360
    }
    if (ball.rs_cooldown === 0) {
      ball.rs_quakeActive = true;
      ball.rs_quakeTimer  = 30;
      ball.rs_quakeWaveR  = 0;
      ball.rs_cooldown    = ball.rs_maxCooldown;
      spawnDamageNumber(ball.x, ball.y - ball.radius - 22, '🌍 QUAKE!', '#cc9944');
      addBattleLog('race_skill', { attacker: getBallLabel(ball), aColor: ball.color, text: '🌍 Quake!' });
      // Apply shockwave to all enemies
      for (const en of players) {
        if (!en.alive || en === ball) continue;
        const dx   = en.x - ball.x, dy = en.y - ball.y;
        const dist = Math.hypot(dx, dy) || 1;
        const nx   = dx / dist, ny = dy / dist;
        const falloff = Math.max(0.1, 1 - dist / 380);
        const force   = ball.rs_quakeForce * falloff;
        en.vx += nx * force;
        en.vy += ny * force;
        // Close-range damage (within 160px)
        if (dist < 160) {
          en.takeDamage(ball.rs_quakeDmg, ball.x, ball.y, false, ball);
          spawnDamageNumber(en.x, en.y - en.radius - 14, `🌍 -${ball.rs_quakeDmg}`, '#bb8833');
        }
        // Tag for wall slam (60 frame window ~1s)
        en.quakeSlamFrames = 60;
        en.quakeSlamGiant  = ball;
      }
      spawnSparks(ball.x, ball.y, 20);
    }
    if (ball.rs_quakeTimer <= 0) ball.rs_quakeActive = false;
  }

  // ── DWARF: Master Forge ───────────────────────────────────────
  if (race === 'dwarf' && ball.raceSkillDef) {
    if (ball.rs_forgeFlash > 0) ball.rs_forgeFlash -= speedMul;
    if (ball.rs_cooldown <= 0) {
      _dwarfForge(ball);
      ball.rs_cooldown = ball.rs_maxCooldown;
    }
  }

  // ── ANGEL: Smite ─────────────────────────────────────────────
  if (race === 'angel' && ball.rs_cooldown === 0) {
    ball.rs_cooldown = ball.rs_maxCooldown;
    rstate.smiteEffects = rstate.smiteEffects || [];
    rstate.smiteEffects.push({
      castX: nearest.x, castY: nearest.y,   // locked cast-time coords (visual origin reference)
      target: nearest,
      timer: 60, maxTimer: 60,
      dmg: ball.rs_smiteDmg, stunDur: ball.rs_smiteStun,
      caster: ball, hit: false,
    });
    spawnDamageNumber(nearest.x, nearest.y - nearest.radius - 22, '✨ SMITE!', '#ffffaa');
    addBattleLog('race_skill', { attacker: getBallLabel(ball), aColor: ball.color,
      text: `✨ Smite → ${getBallLabel(nearest)}` });
  }

  // ── GOD: Sub-race Passives ────────────────────────────────────
  if (race === 'god' && ball.raceSkillDef) {
    const srLabel = ball.charSubrace?.label || '';
    const mTime   = rstate.matchTime || 0;

    // ─ Blessed by Surtr: Divine Slam at 70s ─
    if (srLabel === 'Blessed by Surtr') {
      if (!ball.rs_god70done && mTime >= 70 * 60) {
        ball.rs_god70done  = true;
        ball.rs_slamActive = true;
        ball.rs_slamTimer  = 30;   // 30 frame wave expand
        ball.rs_slamWaveR  = 0;
        // Clear all traps
        if (rstate.trapObjects) rstate.trapObjects.length = 0;
        spawnDamageNumber(ball.x, ball.y - ball.radius - 28, '✊ DIVINE SLAM!', '#ffdd00');
        spawnSparks(ball.x, ball.y, 24);
        addBattleLog('race_skill', { attacker: getBallLabel(ball), aColor: ball.color,
          text: '✊ Divine Slam! All traps cleared — enemies scattered!' });
        // Knockback all enemies, tag for wall slam
        for (const en of players) {
          if (!en.alive || en === ball) continue;
          const dx = en.x - ball.x, dy = en.y - ball.y;
          const dist = Math.hypot(dx, dy) || 1;
          const nx = dx / dist, ny = dy / dist;
          const falloff = Math.max(0.15, 1 - dist / 380);
          en.vx += nx * ball.rs_godForce * falloff;
          en.vy += ny * ball.rs_godForce * falloff;
          // Close-range damage (within 160px)
          if (dist < 160) {
            en.takeDamage(ball.rs_godDmg, ball.x, ball.y, false, ball);
            spawnDamageNumber(en.x, en.y - en.radius - 14, `✊ -${ball.rs_godDmg}`, '#ffbb33');
          }
          // Tag for wall slam — reuse quake slam window
          en.quakeSlamFrames = 60;
          en.quakeSlamGiant  = ball;
        }
      }
      if (ball.rs_slamTimer > 0) {
        ball.rs_slamTimer--;
        ball.rs_slamWaveR = (1 - ball.rs_slamTimer / 30) * 380;
      }
      if (ball.rs_slamTimer <= 0) ball.rs_slamActive = false;
    }

    // ─ Blessed by Shiva: Martial God at 70s — switch to fists ─
    if (srLabel === 'Blessed by Shiva' && !ball.rs_god70done && mTime >= 70 * 60) {
      ball.rs_god70done     = true;
      ball.rs_maTransformed = true;
      ball.weaponId  = 'fists';
      ball.weaponDef = WEAPON_MAP['fists'];
      ball.weapon    = ball._initWeapon('fists');
      spawnDamageNumber(ball.x, ball.y - ball.radius - 28, '🥋 MARTIAL GOD!', '#ff88ff');
      spawnSparks(ball.x, ball.y, 16);
      addBattleLog('race_skill', { attacker: getBallLabel(ball), aColor: ball.color,
        text: '🥋 Martial God! Weapon discarded — pure martial arts!' });
    }

    // ─ Blessed by Raijin: stacks tracked in ball.js wall bounce code ─

    // ─ Blessed by Atlas: Soul of Stone — regen HP every 90 frames ─
    if (srLabel === 'Blessed by Atlas') {
      ball.rs_durRegenTimer = (ball.rs_durRegenTimer || 0) + 1;
      if (ball.rs_durRegenTimer >= 90) {
        ball.rs_durRegenTimer = 0;
        const dur = ball.charDUR ?? 5;
        const regen = Math.max(0.5, dur * 0.05); // DUR5→0.25, DUR10→0.5, DUR20→1.0 HP/tick
        ball.hp = Math.min(ball.maxHp, ball.hp + regen);
        spawnDamageNumber(ball.x, ball.y - ball.radius - 12,
          `🛡️ +${regen.toFixed(1)}`, '#88ddff');
        addBattleLog('heal', { attacker: getBallLabel(ball), aColor: ball.color,
          heal: +regen.toFixed(1), hpAfter: +ball.hp.toFixed(1), source: 'Atlas Regen' });
      }
    }
  }

  // ── SKELETON: Bone Scatter — speed timer tick + drop cooldown tick ──
  if (race === 'skeleton' && ball.raceSkillDef) {
    if ((ball.rs_shardSpeedTimer || 0) > 0) {
      ball.rs_shardSpeedTimer--;
      if (ball.rs_shardSpeedTimer === 0)
        spawnDamageNumber(ball.x, ball.y - ball.radius - 14, '🦴 speed fades', '#ccaa66');
    }
    if ((ball.rs_boneDropCd || 0) > 0) ball.rs_boneDropCd--;
  }

  // ── DEMON: Blood Contract ─────────────────────────────────────
  if (race === 'demon' && ball.raceSkillDef) {
    if (ball.rs_active) {
      ball.rs_timer--;
      if (ball.rs_timer <= 0) {
        ball.rs_active   = false;
        ball.rs_cooldown = ball.rs_maxCooldown;
        spawnDamageNumber(ball.x, ball.y - ball.radius - 18, '📜 Pact ended', '#aa3366');
        addBattleLog('race_skill', { attacker: getBallLabel(ball), aColor: ball.color,
          text: '📜 Blood Contract expired' });
      }
    } else if (ball.rs_cooldown === 0) {
      // Sacrifice 15% current HP — need at least 2 HP to activate
      const sacrifice = ball.hp * 0.15;
      if (ball.hp - sacrifice >= 1) {
        ball.hp      -= sacrifice;
        ball.rs_active = true;
        ball.rs_timer  = ball.rs_duration;
        spawnDamageNumber(ball.x, ball.y - ball.radius - 24, `BLOOD CONTRACT! (−${sacrifice.toFixed(1)})`, '#cc0044');
        if (typeof ball.shout === 'function') ball.shout('BLOOD CONTRACT!', 220, '#cc0044');
        addBattleLog('race_skill', { attacker: getBallLabel(ball), aColor: ball.color,
          text: `📜 Blood Contract! (−${sacrifice.toFixed(1)} HP sacrifice)` });
      } else {
        ball.rs_cooldown = 60; // retry in 1s if too low HP
      }
    }
  }
}

// Called once per step() to update troll nets + smite effects
function updateRaceSkillProjectiles(rstate) {
  const players = rstate.players;

  // ── Troll Nets ────────────────────────────────────────────────
  rstate.trollNets = rstate.trollNets || [];

  // Spawn new nets
  for (const ball of players) {
    if (!ball.alive || ball.charRace !== 'troll' || !ball.raceSkillDef) continue;
    if (ball.rs_cooldown > 0) continue;
    const enemies = players.filter(p => p !== ball && p.alive);
    if (!enemies.length) continue;
    const target = enemies.reduce((a,b) =>
      Math.hypot(ball.x-a.x,ball.y-a.y) < Math.hypot(ball.x-b.x,ball.y-b.y) ? a : b);
    const dx = target.x - ball.x, dy = target.y - ball.y;
    const dist = Math.hypot(dx,dy) || 1;
    rstate.trollNets.push({
      x: ball.x, y: ball.y,
      startX: ball.x, startY: ball.y,
      vx: (dx/dist)*7, vy: (dy/dist)*7,
      caster: ball, trapDur: ball.rs_trapDur,
      life: 160, r: 10, angle: 0,
    });
    ball.rs_cooldown = ball.rs_maxCooldown;
    addBattleLog('race_skill', { attacker: getBallLabel(ball), aColor: ball.color, text: '🕸️ Net thrown!' });
  }

  // Move + hit-check nets
  for (let i = rstate.trollNets.length - 1; i >= 0; i--) {
    const net = rstate.trollNets[i];
    net.x += net.vx; net.y += net.vy; net.life--;
    // Grow hitbox + visual as it travels — farther = bigger net
    const traveled = Math.hypot(net.x - net.startX, net.y - net.startY);
    net.r = 10 + traveled * 0.032;   // ~10px at origin → ~30px at 600px range
    net.angle = (net.angle || 0) + 0.08; // slow spin for visual flair
    let hit = false;
    for (const p of players) {
      if (!p.alive || p === net.caster) continue;
      if (Math.hypot(p.x - net.x, p.y - net.y) < p.radius + net.r) {
        p.netTrapped = net.trapDur;
        spawnDamageNumber(p.x, p.y - p.radius - 22, '🕸️ TRAPPED!', '#ccaa55');
        spawnSparks(p.x, p.y, 8);
        addBattleLog('race_skill', { attacker: getBallLabel(net.caster), aColor: net.caster.color,
          text: `🕸️ Net trapped ${getBallLabel(p)}!` });
        hit = true; break;
      }
    }
    if (hit || net.life <= 0) {
      // Miss penalty: only 70% of full cooldown (minus flight time already elapsed)
      if (!hit && net.caster.alive) {
        const missCD = Math.max(0, Math.round(net.caster.rs_maxCooldown * 0.70) - 120);
        net.caster.rs_cooldown = missCD;
        addBattleLog('race_skill', { attacker: getBallLabel(net.caster), aColor: net.caster.color,
          text: '🕸️ Net missed!' });
      }
      rstate.trollNets.splice(i, 1);
    }
  }

  // ── Smite Effects ─────────────────────────────────────────────
  rstate.smiteEffects = rstate.smiteEffects || [];
  for (let i = rstate.smiteEffects.length - 1; i >= 0; i--) {
    const s = rstate.smiteEffects[i];
    s.timer--;
    if (!s.hit && s.timer <= Math.floor(s.maxTimer * 0.45)) {
      s.hit = true;
      if (s.target.alive) {
        // Distance check: if target moved more than 2.5× their radius from cast point → miss
        const ex = s.target.x, ey = s.target.y;
        const driftDx = ex - s.castX, driftDy = ey - s.castY;
        const drift = Math.sqrt(driftDx*driftDx + driftDy*driftDy);
        const missThreshold = s.target.radius * 2.5 + (s.target.charSPD ?? 5) * 8;
        if (drift > missThreshold) {
          // Bolt fizzles — show miss visual at current target pos
          spawnDamageNumber(ex, ey - s.target.radius - 16, '✨ miss!', '#aaaaaa');
          spawnSparks(ex, ey, 5);
          addBattleLog('race_skill', { attacker: getBallLabel(s.caster), aColor: s.caster.color,
            text: `✨ Smite missed ${getBallLabel(s.target)} (dodged)` });
        } else {
          s.target.hp = Math.max(0, s.target.hp - s.dmg);
          s.target.stunTimer = s.stunDur;
          s.target.hitFlash  = 20;
          s.caster.stats.damageDone += s.dmg;
          spawnDamageNumber(ex, ey - s.target.radius - 16,
            `⚡ -${s.dmg.toFixed(0)}`, '#ffffaa');
          spawnSparks(ex, ey, 14);
          addBattleLog('race_skill', { attacker: getBallLabel(s.caster), aColor: s.caster.color,
            text: `✨ Smite hit ${getBallLabel(s.target)} for ${s.dmg.toFixed(0)}!` });
          if (s.target.hp <= 0 && s.target.alive) {
            s.target.alive = false; skillOnKill(s.caster, s.target);
          }
        }
      }
    }
    if (s.timer <= 0) rstate.smiteEffects.splice(i, 1);
  }

  // ── Skeleton Bone Shards — pickup / enemy-destroy ─────────────
  // Bone Scatter (race skill Skeleton): mỗi khi bị đánh trúng →
  //   50% chance rơi rs_shardCount mảnh xương ra xung quanh (rstate.boneShards[]).
  // Logic nhặt / hủy mảnh xương mỗi frame:
  //   - Skeleton đụng mảnh → nhặt được: hồi HP (rawHeal × overtimeHealMult) + speed boost
  //   - Non-skeleton đụng mảnh → mảnh bị hủy (không nhặt được, chỉ block)
  //   - Skeleton đấu skeleton: cả hai đều có thể nhặt xương của nhau (shared loot)
  //   - overtimeHealMult: về 0 ở 2:00 → giải quyết bug hồi máu vô hạn ở late game
  rstate.boneShards = rstate.boneShards || [];
  for (let i = rstate.boneShards.length - 1; i >= 0; i--) {
    const sh = rstate.boneShards[i];
    sh.life--;
    sh.angle += 0.04; // xoay chậm mảnh xương để dễ nhìn
    if (sh.life <= 0) { rstate.boneShards.splice(i, 1); continue; }

    let hit = false;
    for (const ball of players) {
      if (!ball.alive) continue;
      if (Math.hypot(ball.x - sh.x, ball.y - sh.y) > ball.radius + sh.r) continue;

      if (ball.charRace === 'skeleton') {
        // Mọi skeleton đều nhặt được xương của nhau (skeleton vs skeleton = shared loot)
        const rawHeal = sh.owner.rs_shardHeal ?? 7.5; // DUR×1.5 HP của chủ sở hữu mảnh
        // Nhân với overtimeHealMult để giảm dần về 0 từ 80s–2:00 (ngăn hồi vô hạn)
        const heal = rawHeal * (typeof getOvertimeHealMult === 'function' ? getOvertimeHealMult() : 1);
        ball.hp = Math.min(ball.maxHp, ball.hp + heal);
        ball.rs_shardSpeedTimer = (ball.rs_shardSpeedTimer || 0) + (ball.rs_shardSpeedDur || 180);
        spawnDamageNumber(ball.x, ball.y - ball.radius - 14, `🦴 +${heal.toFixed(1)} HP`, '#eedd88');
        if (typeof addBattleLog === 'function')
          addBattleLog('heal', { attacker: getBallLabel(ball), aColor: ball.color,
            heal: +heal.toFixed(1), hpAfter: +ball.hp.toFixed(1), source: 'Bone Scatter' });
      }
      // Cả skeleton nhặt AND non-skeleton đạp lên đều hủy mảnh xương
      rstate.boneShards.splice(i, 1);
      hit = true;
      break;
    }
    if (hit) continue;
  }

  // ── Dropped Weapons (Disarm skill) ────────────────────────────
  rstate.droppedWeapons = rstate.droppedWeapons || [];
  for (let i = rstate.droppedWeapons.length - 1; i >= 0; i--) {
    const dw = rstate.droppedWeapons[i];
    dw.life--;
    // Friction
    dw.vx *= 0.93;
    dw.vy *= 0.93;
    dw.x += dw.vx;
    dw.y += dw.vy;
    dw.angle += (dw.vx + dw.vy) * 0.04;

    // Wall bounce (simple canvas bounds 0-1000)
    if (dw.x - dw.r < 0)    { dw.x = dw.r;      dw.vx = Math.abs(dw.vx) * 0.6; }
    if (dw.x + dw.r > 1000) { dw.x = 1000-dw.r; dw.vx = -Math.abs(dw.vx) * 0.6; }
    if (dw.y - dw.r < 0)    { dw.y = dw.r;      dw.vy = Math.abs(dw.vy) * 0.6; }
    if (dw.y + dw.r > 1000) { dw.y = 1000-dw.r; dw.vy = -Math.abs(dw.vy) * 0.6; }

    if (dw.kickCooldown > 0) dw.kickCooldown--;
    if (dw.spawnGrace > 0) dw.spawnGrace--;

    let expired = dw.life <= 0;
    if (dw.spawnGrace > 0) continue; // grace period — no pickup/kick yet
    for (const ball of players) {
      if (!ball.alive) continue;
      const dist = Math.hypot(ball.x - dw.x, ball.y - dw.y);
      if (dist > ball.radius + dw.r) continue;

      if (ball === dw.owner) {
        // Owner picks up weapon and recovers
        ball.weaponDef           = dw.weaponDef;
        ball.weapon              = dw.weaponState;
        ball.disarmedDebuff      = false;
        delete ball._disarmedOrigDef;
        delete ball._disarmedOrigWeapon;
        spawnDamageNumber(ball.x, ball.y - ball.radius - 18, '⚔️ REARMED!', '#88ffaa');
        addBattleLog('skill_trigger', { attacker: getBallLabel(ball), aColor: ball.color,
          text: '⚔️ Picked up weapon!' });
        expired = true;
      } else if (dw.kickCooldown <= 0) {
        // Non-owner kicks weapon away
        const dx = dw.x - ball.x, dy = dw.y - ball.y;
        const d = Math.hypot(dx, dy) || 1;
        const kick = 5 + Math.random() * 3;
        dw.vx = (dx/d) * kick + (Math.random()-0.5)*2;
        dw.vy = (dy/d) * kick + (Math.random()-0.5)*2;
        dw.kickCooldown = 30;
        spawnSparks(dw.x, dw.y, 4);
      }
      break;
    }

    if (expired) {
      // Weapon disappears without recovery — owner keeps fists debuff until death
      rstate.droppedWeapons.splice(i, 1);
    }
  }
}

// Called from skillOnHit when a melee weapon hits a Primordial
function raceSkillOnHitDefending(attacker, defender) {
  if (defender.charRace !== 'primordial' || !defender.raceSkillDef) return;
  const melee = ['fists','sword','dagger','spear','scythe','hammer'];
  if (!melee.includes(attacker.weapon?.id)) return;
  if (attacker.rs_weaponStuck > 0) return; // already stuck

  // Guard: verify weapon tip is physically near the Primordial
  // Filters out projectile hits (skillOnHit fires for both melee + projectile)
  const L    = attacker.getWeaponLength ? attacker.getWeaponLength() : (attacker.radius + 30);
  const tipX = attacker.x + Math.cos(attacker.weapon.angle) * L;
  const tipY = attacker.y + Math.sin(attacker.weapon.angle) * L;
  if (Math.hypot(tipX - defender.x, tipY - defender.y) > defender.radius + 18) return;

  if (Math.random() < (defender.rs_stuckChance || 0)) {
    // Calculate weapon tip position at moment of contact
    const L = attacker.getWeaponLength ? attacker.getWeaponLength()
                                       : (attacker.radius + 30);
    const tipX = attacker.x + Math.cos(attacker.weapon.angle) * L;
    const tipY = attacker.y + Math.sin(attacker.weapon.angle) * L;

    attacker.rs_weaponStuck    = defender.rs_stuckDur || 90;
    attacker.rs_stuckTarget    = defender;
    // Offset from Primordial center → contact point (rigid, moves with Primordial)
    attacker.rs_stuckLocalX    = tipX - defender.x;
    attacker.rs_stuckLocalY    = tipY - defender.y;
    // Weapon length (distance ball → tip)
    attacker.rs_stuckWeaponLen = L;
    // Angle from tip → ball (opposite of weapon.angle, used to reposition ball)
    attacker.rs_stuckBallAngle = Math.atan2(attacker.y - tipY, attacker.x - tipX);
    // Save and cap max speed
    attacker.rs_savedMaxSpd    = attacker.maxSpd;
    attacker.maxSpd            = 0;  // completely pinned

    spawnDamageNumber(attacker.x, attacker.y - attacker.radius - 22,
      '🌌 WEAPON STUCK!', '#cc88ff');
    addBattleLog('race_skill', { attacker: getBallLabel(defender), aColor: defender.color,
      text: `🌌 Void Grip: ${getBallLabel(attacker)} weapon stuck!` });
  }
}

// ── Draw global race skill effects on canvas ──────────────────
function drawRaceSkillEffects(ctx, rstate) {
  const t = rstate.matchTime || 0;

  // Troll nets in flight
  (rstate.trollNets || []).forEach(net => {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = '#ccaa55';
    ctx.lineWidth = Math.max(1.2, net.r * 0.10); // line dày dần theo size
    ctx.beginPath();
    ctx.arc(net.x, net.y, net.r, 0, Math.PI*2);
    ctx.stroke();
    for (let a = 0; a < Math.PI; a += Math.PI/3) {
      const ra = a + (net.angle || 0);
      ctx.beginPath();
      ctx.moveTo(net.x + Math.cos(ra)*net.r, net.y + Math.sin(ra)*net.r);
      ctx.lineTo(net.x - Math.cos(ra)*net.r, net.y - Math.sin(ra)*net.r);
      ctx.stroke();
    }
    ctx.restore();
  });

  // Skeleton Bone Shards on the floor
  (rstate.boneShards || []).forEach(sh => {
    const alpha = Math.min(1, sh.life / 60) * 0.92; // fade out last 1s
    const cx = sh.x, cy = sh.y, a = sh.angle;
    ctx.save();
    ctx.globalAlpha = alpha;
    // Glow
    ctx.shadowColor = '#e8d8a0';
    ctx.shadowBlur  = 10;
    // Draw a simple bone shape: 2 circles at ends + rect shaft
    const L = sh.r * 1.1, bR = sh.r * 0.55;
    ctx.fillStyle = '#d4c07a';
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 1.2;
    // Shaft
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.rect(-L, -bR * 0.38, L * 2, bR * 0.76);
    ctx.fill(); ctx.stroke();
    // End knobs
    for (const ex of [-L, L]) {
      ctx.beginPath(); ctx.arc(ex, 0, bR, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  });

  // Dropped Weapons (Disarm)
  (rstate.droppedWeapons || []).forEach(dw => {
    const alpha = Math.min(1, dw.life / 60) * 0.92;
    const ownerNearby = dw.owner && Math.hypot(dw.owner.x - dw.x, dw.owner.y - dw.y) < 80;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(dw.x, dw.y);
    ctx.rotate(dw.angle);
    // Glow — orange normally, pulse green when owner is nearby
    ctx.shadowColor = ownerNearby ? '#66ff88' : '#ffaa33';
    ctx.shadowBlur  = ownerNearby ? 18 + 6 * Math.sin(t * 0.25) : 12;
    // Draw a simple crossed-sword icon: two rects at ±45°
    const wColor = dw.weaponDef?.color ?? '#cccccc';
    ctx.fillStyle   = wColor;
    ctx.strokeStyle = '#333';
    ctx.lineWidth   = 1.2;
    for (const rot of [Math.PI/4, -Math.PI/4]) {
      ctx.save();
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.rect(-dw.r*0.18, -dw.r, dw.r*0.36, dw.r*2);
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  });

  // Blessed by Surtr: Divine Slam shockwave ring
  for (const ball of (rstate.players || [])) {
    if (ball.charRace !== 'god' || !ball.rs_slamActive || ball.rs_slamTimer <= 0) continue;
    const waveR = ball.rs_slamWaveR || 0;
    if (waveR <= 0) continue;
    const alpha = (ball.rs_slamTimer / 30) * 0.75;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 22;
    ctx.strokeStyle = '#ffe033'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(ball.x, ball.y, waveR, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = alpha * 0.3;
    ctx.lineWidth = 9;
    ctx.beginPath(); ctx.arc(ball.x, ball.y, waveR + 14, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // Giant Quake: expanding shockwave ring from each giant ball
  for (const ball of (rstate.players || [])) {
    if (ball.charRace !== 'giant' || !ball.rs_quakeActive || ball.rs_quakeTimer <= 0) continue;
    const waveR = ball.rs_quakeWaveR || 0;
    if (waveR <= 0) continue;
    const alpha = (ball.rs_quakeTimer / 30) * 0.7;   // fades as timer counts down
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = '#cc9944'; ctx.shadowBlur = 18;
    ctx.strokeStyle = '#ddbb44'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(ball.x, ball.y, waveR, 0, Math.PI * 2); ctx.stroke();
    // Second fainter outer ring
    ctx.globalAlpha = alpha * 0.35;
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(ball.x, ball.y, waveR + 12, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // Smite: telegraph warning ring + lightning bolt (tracks target)
  (rstate.smiteEffects || []).forEach(s => {
    const progress  = 1 - s.timer / s.maxTimer;           // 0→1 over lifetime
    const tx = s.target.alive ? s.target.x : s.castX;    // track live target pos
    const ty = s.target.alive ? s.target.y : s.castY;
    const tr = s.target.radius;

    // ── Phase 1: windup telegraph (0%–55%) ─────────────────────
    // Pulsing warning ring + crosshair on target so player knows bolt is coming
    if (progress < 0.55) {
      const windupT = progress / 0.55;                    // 0→1 within windup
      const pulse   = Math.sin(progress * Math.PI * 8);  // fast pulse, more urgent near strike
      const ringR   = tr + 10 + pulse * 6;
      const ringA   = 0.35 + windupT * 0.45;             // grows more opaque toward strike

      ctx.save();
      // Outer warning ring
      ctx.globalAlpha = ringA;
      ctx.shadowColor  = '#ffffaa';
      ctx.shadowBlur   = 10 + windupT * 14;
      ctx.strokeStyle  = `hsl(50, 100%, ${55 + windupT * 30}%)`;
      ctx.lineWidth    = 1.5 + windupT * 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.arc(tx, ty, ringR, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);

      // Crosshair lines (converging toward target center)
      const crossLen = 10 + (1 - windupT) * 14;         // shrinks as strike approaches
      ctx.lineWidth = 1.2; ctx.shadowBlur = 6;
      [0, Math.PI/2, Math.PI, Math.PI*1.5].forEach(ang => {
        const ox = tx + Math.cos(ang) * (ringR + crossLen);
        const oy = ty + Math.sin(ang) * (ringR + crossLen);
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(tx + Math.cos(ang) * ringR, ty + Math.sin(ang) * ringR);
        ctx.stroke();
      });
      ctx.restore();
    }

    // ── Phase 2: lightning strike (45%–100%) ───────────────────
    if (progress >= 0.45) {
      let alpha = progress < 0.5
        ? (progress - 0.45) / 0.05        // fast fade-in over 5%
        : (1 - progress) / 0.5;           // fade-out over remaining 50%
      alpha = Math.max(0, Math.min(1, alpha));
      if (alpha < 0.01) return;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = '#ffffaa'; ctx.shadowBlur = 24;
      ctx.strokeStyle = '#ffffee'; ctx.lineWidth = 3 + Math.random() * 2;
      ctx.beginPath();
      const segs = 8;
      ctx.moveTo(tx, 0);
      for (let k = 1; k < segs; k++) {
        const frac = k / segs;
        ctx.lineTo(tx + (Math.random()-0.5) * 30 * (1 - frac), ty * frac);
      }
      ctx.lineTo(tx, ty);
      ctx.stroke();

      // Inner white core
      ctx.globalAlpha = alpha * 0.6;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(tx, 0); ctx.lineTo(tx, ty); ctx.stroke();

      // Impact circle
      if (progress > 0.45) {
        const ir = 28 * (progress - 0.45) / 0.55;
        ctx.globalAlpha = alpha * 0.28;
        ctx.fillStyle = '#ffffaa';
        ctx.beginPath(); ctx.arc(tx, ty, ir, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  });
}

// ── Draw per-ball overlays (auras, cooldown arc, net, stuck) ──
function drawRaceSkillUI(ctx, ball) {
  if (!ball.raceSkillDef || !ball.alive) return;
  const race = ball.charRace;
  const t    = state.matchTime || 0;
  const cx = ball.x, cy = ball.y, r = ball.radius;

  // Net-trapped: crosshatch overlay on ball
  if (ball.netTrapped > 0) {
    ctx.save();
    ctx.strokeStyle = '#ccaa55'; ctx.lineWidth = 2;
    ctx.setLineDash([3,4]); ctx.globalAlpha = 0.7;
    for (let a = 0; a < Math.PI; a += Math.PI/3) {
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a)*r, cy + Math.sin(a)*r);
      ctx.lineTo(cx - Math.cos(a)*r, cy - Math.sin(a)*r);
      ctx.stroke();
    }
    ctx.setLineDash([]); ctx.restore();
  }

  // Weapon-stuck: violet pulsing ring
  if (ball.rs_weaponStuck > 0) {
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.3*Math.sin(t*0.4);
    ctx.strokeStyle = '#cc88ff'; ctx.lineWidth = 2.5;
    ctx.shadowColor = '#cc88ff'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(cx, cy, r+5, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }

  // Primordial: permanent swirling void aura
  if (race === 'primordial') {
    ctx.save();
    ctx.globalAlpha = 0.18 + 0.08*Math.sin(t*0.05);
    ctx.strokeStyle = '#aa88ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r+7, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }

  // Dragon: fire cone + pulsing glow while breathing
  if (race === 'dragon' && ball.rs_active) {
    const coneAng = ball.rs_sweepBase
      + Math.sin((ball.rs_flameTick || 0) * (ball.rs_sweepFreq || 0.06))
        * (ball.rs_sweepAmp || (40 * Math.PI / 180));
    const coneLen = 80 + ball.rs_duration * 0.25;
    const halfC   = ball.rs_halfCone || (Math.PI / 6);

    ctx.save();

    // Layer 1: wide outer haze — bleeds past cone edges, kills hard-edge feel
    const hazeG = ctx.createRadialGradient(cx, cy, r, cx, cy, coneLen * 1.08);
    hazeG.addColorStop(0,    `rgba(255, 80,  0, ${0.22 + 0.06*Math.sin(t*0.5)})`);
    hazeG.addColorStop(0.55, 'rgba(200, 40,  0, 0.10)');
    hazeG.addColorStop(1,    'rgba(100, 10,  0, 0)');
    ctx.fillStyle = hazeG;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, coneLen * 1.08, coneAng - halfC * 1.65, coneAng + halfC * 1.65);
    ctx.closePath();
    ctx.fill();

    // Layer 2: main fire body with organic (sin-perturbed) tip — no straight edges
    const grad = ctx.createRadialGradient(cx, cy, r, cx, cy, coneLen);
    grad.addColorStop(0,    `rgba(255,200, 60, ${0.78 + 0.14*Math.sin(t*0.6)})`);
    grad.addColorStop(0.35, `rgba(255,100,  0, ${0.55 + 0.10*Math.sin(t*0.5)})`);
    grad.addColorStop(0.72, 'rgba(180,  40,  0, 0.26)');
    grad.addColorStop(1,    'rgba(100,  10,  0, 0)');
    ctx.fillStyle = grad;
    const STEPS = 22;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let si = 0; si <= STEPS; si++) {
      const ang = (coneAng - halfC) + (si / STEPS) * halfC * 2;
      const wobble = 1.0
        + 0.10 * Math.sin(si * 2.3 + t * 0.07)
        + 0.05 * Math.sin(si * 5.1 + t * 0.12);
      ctx.lineTo(cx + Math.cos(ang) * coneLen * wobble,
                 cy + Math.sin(ang) * coneLen * wobble);
    }
    ctx.closePath();
    ctx.fill();

    // Layer 3: bright hot core (narrow, fades quickly — gives depth at mouth)
    const coreG = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, coneLen * 0.52);
    coreG.addColorStop(0,   `rgba(255,240,150, ${0.65 + 0.18*Math.sin(t*0.7)})`);
    coreG.addColorStop(0.5, 'rgba(255,160,  30, 0.28)');
    coreG.addColorStop(1,   'rgba(255, 60,   0, 0)');
    ctx.fillStyle = coreG;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, coneLen * 0.52, coneAng - halfC * 0.5, coneAng + halfC * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // ── Animated flame particles layer (on top of cone) ──────────
    // Clip drawing to the cone shape so particles don't bleed outside
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, coneLen + 6, coneAng - halfC, coneAng + halfC);
    ctx.closePath();
    ctx.clip();

    const NUM_FLAME = 14;
    for (let fi = 0; fi < NUM_FLAME; fi++) {
      // Each particle has its own phase so they're never in sync
      const phase    = (fi / NUM_FLAME) * Math.PI * 2;
      const tf       = t * 0.09 + phase;                          // time seed
      // Distance along cone axis — start at ball edge (r), spread to tip
      const baseDist = r + (fi / NUM_FLAME) * (coneLen - r) * 0.92;
      const dist     = baseDist + Math.sin(tf * 1.4 + fi) * 9;
      // Angular wobble — stays within ±85% of halfCone so particles clip cleanly
      const angWobble = Math.sin(tf * 1.1 + fi * 0.8) * halfC * 0.80;
      const px = cx + Math.cos(coneAng + angWobble) * dist;
      const py = cy + Math.sin(coneAng + angWobble) * dist;
      // Size: larger near mouth, smaller at tip; pulses
      const tRatio = (dist - r) / Math.max(1, coneLen - r);      // 0=near edge 1=far tip
      const sz = (6 - tRatio * 3.5) + Math.sin(tf * 2.1 + fi) * 2;
      // Alpha: fade at far end + pulse
      const alpha = (0.55 + 0.35 * Math.sin(tf * 1.7 + fi)) * (1 - tRatio * 0.6);
      // Color: yellow-white near ball → orange → deep red at tip
      const gCh = Math.floor(220 - tRatio * 190);               // 220 → 30
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.shadowColor = `rgb(255,${gCh},20)`;
      ctx.shadowBlur  = sz * 2.5;
      ctx.fillStyle   = `rgb(255,${gCh},20)`;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(1, sz), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore(); // end clip

    // Ball glow
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.2*Math.sin(t*0.5);
    ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 28;
    ctx.strokeStyle = '#ff8800'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, r+6, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }

  // Orc: bloodlust stack badge + burst-ready crimson ring
  if (race === 'orc') {
    if (ball.rs_burstReady) {
      // Pulsing crimson ring — burst armed
      const pulse = 0.4 + 0.35 * Math.sin(t * 0.7);
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.shadowColor = '#cc2222'; ctx.shadowBlur = 22;
      ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = pulse * 0.35;
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(cx, cy, r + 12, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    const stacks = ball.rs_stacks || 0;
    if (stacks > 0 || ball.rs_burstReady) {
      ctx.save();
      ctx.font = 'bold 11px Arial';
      ctx.fillStyle = ball.rs_burstReady ? '#ff4444' : '#cc8888';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(ball.rs_burstReady ? '🩸 BURST' : `🩸×${stacks}`, cx, cy - r - 4);
      ctx.restore();
    }
  }

  // Giant: ready glow when quake cooldown is 0
  if (race === 'giant' && ball.rs_cooldown === 0 && ball.rs_maxCooldown > 0) {
    const pulse = 0.3 + 0.25 * Math.sin(t * 0.5);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.shadowColor = '#cc9944'; ctx.shadowBlur = 20;
    ctx.strokeStyle = '#ddbb55'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = pulse * 0.3;
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(cx, cy, r + 13, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.font = 'bold 11px Arial'; ctx.fillStyle = '#ddbb55';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('🌍 READY', cx, cy - r - 4);
    ctx.restore();
  }

  // Human: golden limit break glow + stack counter + duration ring
  if (race === 'human' && ball.rs_active) {
    const pulse = 0.3 + 0.25 * Math.sin(t * 0.65);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 28;
    ctx.strokeStyle = '#ffee44'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, Math.PI * 2); ctx.stroke();
    // Second outer ring, softer
    ctx.globalAlpha = pulse * 0.4;
    ctx.strokeStyle = '#ffaa00'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(cx, cy, r + 11, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    if (ball.rs_stacks > 0) {
      ctx.save();
      ctx.font = 'bold 11px Arial'; ctx.fillStyle = '#ffee44';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(`⚡×${ball.rs_stacks}`, cx, cy - r - 4);
      ctx.restore();
    }
    // Duration countdown arc (sweeps away as time runs out)
    if ((ball.rs_lbTimer || 0) > 0) {
      const pct = ball.rs_lbTimer / 480; // 480 = 8s * 60fps
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = pct > 0.33 ? '#ffee44' : '#ff4444';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, r + 16, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
  // Human: exhausted debuff indicator — grey pulsing ring
  if (race === 'human' && ball.rs_lbExhausted) {
    const pulse = 0.2 + 0.15 * Math.sin(t * 0.3);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = '#888888'; ctx.lineWidth = 3;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(cx, cy, r + 8, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.font = 'bold 10px Arial'; ctx.fillStyle = '#aaaaaa';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('💀', cx, cy - r - 2);
    ctx.restore();
  }

  // Cooldown arc (thin arc sweeping around the ball)
  if (ball.rs_maxCooldown > 0 && ball.rs_cooldown > 0) {
    const pct = 1 - ball.rs_cooldown / ball.rs_maxCooldown;
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = ball.rs_active ? '#44ff88' : '#888888';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r+3, -Math.PI/2, -Math.PI/2 + pct*Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }

  // Dwarf: forge flash (golden ring burst when upgrade fires) + persistent level badge
  if (race === 'dwarf') {
    if (ball.rs_forgeFlash > 0) {
      const flashAlpha = Math.min(1, ball.rs_forgeFlash / 20) * 0.9;
      ctx.save();
      ctx.globalAlpha = flashAlpha;
      ctx.strokeStyle = '#f0c040'; ctx.lineWidth = 3.5;
      ctx.shadowColor = '#f0c040'; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(cx, cy, r + 8, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = flashAlpha * 0.4;
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(cx, cy, r + 14, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    if ((ball.rs_forgeLevel || 0) > 0) {
      ctx.save();
      ctx.font = 'bold 11px Arial'; ctx.fillStyle = '#f0c040';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(`⚒️×${ball.rs_forgeLevel}`, cx, cy - r - 4);
      ctx.restore();
    }
  }

  // Stun indicator
  if (ball.stunTimer > 0) {
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.3*Math.sin(t*0.6);
    ctx.strokeStyle = '#ffffaa'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r+5, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }

  // Blessed by Raijin: speed stack counter badge + blue aura at high stacks
  if (race === 'god' && ball.charSubrace?.label === 'Blessed by Raijin') {
    const stacks = ball.rs_speedStacks || 0;
    if (stacks > 0) {
      ctx.save();
      ctx.font = 'bold 11px Arial'; ctx.fillStyle = '#66ddff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(`⚡×${stacks}`, cx, cy - r - 4);
      ctx.restore();
    }
    if (stacks >= 10) {
      // Glowing blue aura — projectile immunity active
      const pulse = 0.3 + 0.25 * Math.sin(t * 0.7);
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.shadowColor = '#00aaff'; ctx.shadowBlur = 22;
      ctx.strokeStyle = '#44ccff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = pulse * 0.3;
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(cx, cy, r + 13, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

  // Blessed by Shiva: magenta aura after 70s transformation
  if (race === 'god' && ball.charSubrace?.label === 'Blessed by Shiva' && ball.rs_maTransformed) {
    const pulse = 0.25 + 0.2 * Math.sin(t * 0.5);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.shadowColor = '#ff44ff'; ctx.shadowBlur = 20;
    ctx.strokeStyle = '#ff88ff'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy, r + 5, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.font = 'bold 11px Arial'; ctx.fillStyle = '#ff88ff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('🥋 MARTIAL', cx, cy - r - 4);
    ctx.restore();
  }

  // Blessed by Surtr: golden aura while slam is active (just fired)
  if (race === 'god' && ball.charSubrace?.label === 'Blessed by Surtr' && ball.rs_slamActive) {
    const pulse = 0.4 + 0.3 * Math.sin(t * 0.8);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 26;
    ctx.strokeStyle = '#ffee44'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, r + 7, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // Blessed by Surtr: "READY" glow when at 70s but not yet triggered
  if (race === 'god' && ball.charSubrace?.label === 'Blessed by Surtr' && !ball.rs_god70done && (state.matchTime || 0) >= 70 * 60) {
    const pulse = 0.3 + 0.25 * Math.sin(t * 0.5);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 20;
    ctx.strokeStyle = '#ffe033'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.font = 'bold 11px Arial'; ctx.fillStyle = '#ffee44';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('✊ READY', cx, cy - r - 4);
    ctx.restore();
  }
}
