/* Colours the canvas code needs as literals (CSS variables can't reach a 2D context
   cheaply). Keep in step with :root in globals.css. */

export const C = {
  bench: "#06191E",
  slide: "#0C252B",
  chalk: "#E8F0EB",
  fog: "#8BA9A5",
  agar: "#F2B64B",
  yeast: "#A3E36A",
  eye: "#F0454F",
  frost: "#86A7D6",
  wire: "#1F4148"
} as const;

export const BEHAVIOUR_COLOR: Record<string, string> = {
  approach: C.yeast,
  avoid: C.eye,
  explore: C.agar,
  freeze: C.frost
};

export const BEHAVIOUR_VERB: Record<string, string> = {
  approach: "heads for food",
  avoid: "backs away",
  explore: "wanders",
  freeze: "holds still"
};

export const BEHAVIOUR_VERB_ZH: Record<string, string> = {
  approach: "朝食物走去",
  avoid: "往后退",
  explore: "四处闲逛",
  freeze: "原地不动"
};

/** One identity colour per fly of the day — soft, distinguishable on the dark dish,
 *  and kept away from the four behaviour colours. */
export const FLY_HUES = ["#F7D9A8", "#C9B6F2", "#8FD3F0", "#F2A7C3", "#B6E3C9", "#E8C27A", "#A9C1F5", "#F0B79A"] as const;
export const flyHue = (i: number) => FLY_HUES[i % FLY_HUES.length];

/** The challenger — you — is drawn in agar, the brand colour. */
export const YOU = C.agar;
