/**
 * client/src/utils/avatars.js
 *
 * Curated avatar collections for CodeNest.
 *
 * Feed Avatars — cartoon/illustrated developer styles using DiceBear API.
 * Shadow Avatars — abstract/mysterious styles for anonymous identity.
 *
 * DiceBear docs: https://www.dicebear.com/styles/
 * All URLs are deterministic and CDN-served — no uploads required.
 */

const DICEBEAR = 'https://api.dicebear.com/7.x';

// ── Feed Avatars (20) — fun illustrated personas ───────────────────────────
export const FEED_AVATARS = [
  { id: 'f1',  label: 'Dev Fox',      url: `${DICEBEAR}/adventurer/svg?seed=CodeNest1&backgroundColor=b6e3f4` },
  { id: 'f2',  label: 'Tech Cat',     url: `${DICEBEAR}/adventurer/svg?seed=CodeNest2&backgroundColor=c0aede` },
  { id: 'f3',  label: 'Coder Bear',   url: `${DICEBEAR}/adventurer/svg?seed=CodeNest3&backgroundColor=ffd5dc` },
  { id: 'f4',  label: 'Debug Duck',   url: `${DICEBEAR}/adventurer/svg?seed=CodeNest4&backgroundColor=ffdfbf` },
  { id: 'f5',  label: 'Stack Rabbit', url: `${DICEBEAR}/adventurer/svg?seed=CodeNest5&backgroundColor=d1d4f9` },
  { id: 'f6',  label: 'Node Wolf',    url: `${DICEBEAR}/adventurer/svg?seed=CodeNest6&backgroundColor=b6e3f4` },
  { id: 'f7',  label: 'API Panda',    url: `${DICEBEAR}/adventurer/svg?seed=CodeNest7&backgroundColor=c0aede` },
  { id: 'f8',  label: 'Cloud Eagle',  url: `${DICEBEAR}/adventurer/svg?seed=CodeNest8&backgroundColor=ffd5dc` },
  { id: 'f9',  label: 'Git Dragon',   url: `${DICEBEAR}/adventurer/svg?seed=CodeNest9&backgroundColor=d1d4f9` },
  { id: 'f10', label: 'Loop Tiger',   url: `${DICEBEAR}/adventurer/svg?seed=CodeNest10&backgroundColor=b6e3f4` },
  { id: 'f11', label: 'Async Owl',    url: `${DICEBEAR}/fun-emoji/svg?seed=CodeNest11` },
  { id: 'f12', label: 'Pixel Lion',   url: `${DICEBEAR}/fun-emoji/svg?seed=CodeNest12` },
  { id: 'f13', label: 'Binary Bot',   url: `${DICEBEAR}/fun-emoji/svg?seed=CodeNest13` },
  { id: 'f14', label: 'Regex Rex',    url: `${DICEBEAR}/fun-emoji/svg?seed=CodeNest14` },
  { id: 'f15', label: 'Hash Hawk',    url: `${DICEBEAR}/fun-emoji/svg?seed=CodeNest15` },
  { id: 'f16', label: 'Lambda Cat',   url: `${DICEBEAR}/lorelei/svg?seed=CodeNest16&backgroundColor=b6e3f4` },
  { id: 'f17', label: 'Cache Coon',   url: `${DICEBEAR}/lorelei/svg?seed=CodeNest17&backgroundColor=ffd5dc` },
  { id: 'f18', label: 'Fetch Ferret', url: `${DICEBEAR}/lorelei/svg?seed=CodeNest18&backgroundColor=d1d4f9` },
  { id: 'f19', label: 'Null Narwhal', url: `${DICEBEAR}/lorelei/svg?seed=CodeNest19&backgroundColor=c0aede` },
  { id: 'f20', label: 'PR Penguin',   url: `${DICEBEAR}/lorelei/svg?seed=CodeNest20&backgroundColor=ffdfbf` },
];

// ── Shadow Avatars (20) — abstract / mysterious for anonymity ──────────────
export const SHADOW_AVATARS = [
  { id: 's1',  label: 'Shadow A',  url: `${DICEBEAR}/shapes/svg?seed=Shadow1&backgroundColor=09090b` },
  { id: 's2',  label: 'Shadow B',  url: `${DICEBEAR}/shapes/svg?seed=Shadow2&backgroundColor=09090b` },
  { id: 's3',  label: 'Shadow C',  url: `${DICEBEAR}/shapes/svg?seed=Shadow3&backgroundColor=09090b` },
  { id: 's4',  label: 'Shadow D',  url: `${DICEBEAR}/shapes/svg?seed=Shadow4&backgroundColor=09090b` },
  { id: 's5',  label: 'Shadow E',  url: `${DICEBEAR}/shapes/svg?seed=Shadow5&backgroundColor=09090b` },
  { id: 's6',  label: 'Phantom F', url: `${DICEBEAR}/identicon/svg?seed=Phantom1&backgroundColor=09090b` },
  { id: 's7',  label: 'Phantom G', url: `${DICEBEAR}/identicon/svg?seed=Phantom2&backgroundColor=09090b` },
  { id: 's8',  label: 'Phantom H', url: `${DICEBEAR}/identicon/svg?seed=Phantom3&backgroundColor=09090b` },
  { id: 's9',  label: 'Phantom I', url: `${DICEBEAR}/identicon/svg?seed=Phantom4&backgroundColor=09090b` },
  { id: 's10', label: 'Phantom J', url: `${DICEBEAR}/identicon/svg?seed=Phantom5&backgroundColor=09090b` },
  { id: 's11', label: 'Ghost K',   url: `${DICEBEAR}/rings/svg?seed=Ghost1&backgroundColor=09090b` },
  { id: 's12', label: 'Ghost L',   url: `${DICEBEAR}/rings/svg?seed=Ghost2&backgroundColor=09090b` },
  { id: 's13', label: 'Ghost M',   url: `${DICEBEAR}/rings/svg?seed=Ghost3&backgroundColor=09090b` },
  { id: 's14', label: 'Ghost N',   url: `${DICEBEAR}/rings/svg?seed=Ghost4&backgroundColor=09090b` },
  { id: 's15', label: 'Ghost O',   url: `${DICEBEAR}/rings/svg?seed=Ghost5&backgroundColor=09090b` },
  { id: 's16', label: 'Void P',    url: `${DICEBEAR}/pixel-art/svg?seed=Void1&backgroundColor=09090b` },
  { id: 's17', label: 'Void Q',    url: `${DICEBEAR}/pixel-art/svg?seed=Void2&backgroundColor=09090b` },
  { id: 's18', label: 'Void R',    url: `${DICEBEAR}/pixel-art/svg?seed=Void3&backgroundColor=09090b` },
  { id: 's19', label: 'Void S',    url: `${DICEBEAR}/pixel-art/svg?seed=Void4&backgroundColor=09090b` },
  { id: 's20', label: 'Void T',    url: `${DICEBEAR}/pixel-art/svg?seed=Void5&backgroundColor=09090b` },
];
