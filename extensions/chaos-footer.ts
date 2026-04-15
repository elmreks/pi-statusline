import { readFileSync } from "node:fs";
import type { AssistantMessage } from "@mariozechner/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

// Chaos footer extension.
//
// Most of the easy customization now lives in CONFIG below.
// Change colors, labels, and animation speed there first.

const CONFIG = {
  // Plain-text file with one bot blurt per line.
  blurtFile: `${process.env.HOME || "~"}/.pi/agent/bot-blurts.txt`,

  // Footer animation speed in milliseconds. Lower = faster.
  animationMs: 120,

  // Session-name pill colors.
  sessionPill: {
    bg: { r: 168, g: 214, b: 109 },
    fg: { r: 50, g: 55, b: 67 },
  },

  // Rainbow tuning for the middle stats section.
  rainbow: {
    hueCharStep: 22,
    hueFrameStep: 14,
    base: 165,
    amplitude: 55,
  },

  // Rotate the right-side bot blurt after each completed input cycle.
  // A cycle here means one full agent run for one user prompt.
  rotateOnAgentEnd: true,

  // Text fragments / labels.
  labels: {
    branchPrefix: "⎇",
    sectionDivider: "|",
    rightDivider: "|",
    unnamedSession: "unnamed",
    noModel: "no-model",
    fallbackBlurt: "robot power!",
  },

  // Random blurt text color tuning.
  blurtColor: {
    base: 170,
    amplitude: 70,
  },

  // UI copy for slash commands.
  messages: {
    enabled: "Chaos footer enabled. Run /chaos-footer again or /chaos-footer-off to revert.",
    restored: "Default footer restored.",
  },
};

// Compact formatting for token counters.
function fmtNumber(n: number): string {
  if (n < 1000) return `${n}`;
  if (n < 1000000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1000000).toFixed(1)}m`;
}

// Apply 24-bit foreground color.
function rgb(r: number, g: number, b: number, text: string): string {
  return `\x1b[38;2;${r};${g};${b}m${text}\x1b[39m`;
}

// Apply 24-bit background color.
function bgRgb(r: number, g: number, b: number, text: string): string {
  return `\x1b[48;2;${r};${g};${b}m${text}\x1b[49m`;
}

// Session-name pill styling.
function styleSessionPill(text: string): string {
  const { bg, fg } = CONFIG.sessionPill;
  return bgRgb(bg.r, bg.g, bg.b, rgb(fg.r, fg.g, fg.b, text));
}

// Color one visible character in the animated middle stats area.
function rainbowChar(ch: string, index: number, frame: number): string {
  if (ch === " ") return ch;
  const { hueCharStep, hueFrameStep, base, amplitude } = CONFIG.rainbow;
  const hue = (index * hueCharStep + frame * hueFrameStep) % 360;
  const rad = (hue * Math.PI) / 180;
  const r = Math.round(base + amplitude * Math.sin(rad));
  const g = Math.round(base + amplitude * Math.sin(rad + (2 * Math.PI) / 3));
  const b = Math.round(base + amplitude * Math.sin(rad + (4 * Math.PI) / 3));
  return rgb(r, g, b, ch);
}

// Apply the rainbow animation across a full string.
function rainbowText(text: string, frame: number): string {
  let out = "";
  let visibleIndex = 0;
  for (const ch of text) {
    out += rainbowChar(ch, visibleIndex, frame);
    if (ch !== " ") visibleIndex++;
  }
  return out;
}

function getCwdDisplay(cwd: string): string {
  const home = process.env.HOME || "";
  return cwd.startsWith(home)
    ? `~/${cwd.slice(home.length).replace(/^\//, "")}`
    : cwd;
}

function buildLeftText(cwdDisplay: string, sessionName: string): { text: string; sessionLabel: string } {
  const sessionLabel = ` ${sessionName} `;
  return {
    sessionLabel,
    text: ` ${cwdDisplay} ${sessionLabel}`,
  };
}

function buildLeftToMidDivider(): string {
  return ` ${CONFIG.labels.sectionDivider} `;
}

function buildMidText(input: number, output: number, cost: number): string {
  return `↑${fmtNumber(input)} ↓${fmtNumber(output)} $${cost.toFixed(3)}`;
}

function loadBotBlurts(): string[] {
  try {
    return readFileSync(CONFIG.blurtFile, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
  } catch {
    return [];
  }
}

function getCurrentBlurt(blurts: string[], blurtIndex: number): string {
  if (!blurts.length) return CONFIG.labels.fallbackBlurt;
  return blurts[blurtIndex % blurts.length] || CONFIG.labels.fallbackBlurt;
}

function randomBlurtTextColor(): { r: number; g: number; b: number } {
  const { base, amplitude } = CONFIG.blurtColor;
  const hue = Math.floor(Math.random() * 360);
  const rad = (hue * Math.PI) / 180;
  return {
    r: Math.round(base + amplitude * Math.sin(rad)),
    g: Math.round(base + amplitude * Math.sin(rad + (2 * Math.PI) / 3)),
    b: Math.round(base + amplitude * Math.sin(rad + (4 * Math.PI) / 3)),
  };
}

function styleBlurtText(text: string, color: { r: number; g: number; b: number }): string {
  return rgb(color.r, color.g, color.b, text);
}

function buildMidToRightPrefix(model: string, branch: string | null): string {
  return ` ${CONFIG.labels.sectionDivider} ${model}${branch ? ` ${CONFIG.labels.branchPrefix} ${branch}` : ""} ${CONFIG.labels.rightDivider} `;
}

export default function (pi: ExtensionAPI) {
  // Starts enabled automatically when pi loads the extension.
  let enabled = true;
  let botBlurts = loadBotBlurts();
  let blurtIndex = 0;
  let blurtTextColor = randomBlurtTextColor();

  // Installs the custom footer for the current session.
  const applyFooter = (ctx: ExtensionContext) => {
    ctx.ui.setFooter((tui, theme, footerData) => {
      let frame = 0;

      // Animation loop. Lower CONFIG.animationMs = faster rainbow updates.
      const interval = setInterval(() => {
        frame = (frame + 1) % 10000;
        tui.requestRender();
      }, CONFIG.animationMs);

      const offBranch = footerData.onBranchChange(() => tui.requestRender());

      return {
        dispose() {
          clearInterval(interval);
          offBranch();
        },
        invalidate() {},
        render(width: number): string[] {
          // Recompute token usage each render so the footer stays live.
          let input = 0;
          let output = 0;
          let cost = 0;

          for (const e of ctx.sessionManager.getBranch()) {
            if (e.type === "message" && e.message.role === "assistant") {
              const m = e.message as AssistantMessage;
              input += m.usage.input;
              output += m.usage.output;
              cost += m.usage.cost.total;
            }
          }

          const branch = footerData.getGitBranch();
          const sessionName = pi.getSessionName() || CONFIG.labels.unnamedSession;
          const model = ctx.model?.id || CONFIG.labels.noModel;
          const cwdDisplay = getCwdDisplay(ctx.cwd);
          const blurt = getCurrentBlurt(botBlurts, blurtIndex);

          // Footer zones:
          // - left: cwd + highlighted session name
          // - divider: plain pipe between name and token stats
          // - middle: animated token + cost stats
          // - right: model + git branch + colored blurt
          const { text: plainLeft, sessionLabel } = buildLeftText(cwdDisplay, sessionName);
          const plainDivider = buildLeftToMidDivider();
          const plainMid = buildMidText(input, output, cost);
          const rightPrefix = buildMidToRightPrefix(model, branch);
          const plainRight = rightPrefix + blurt;

          // Fit everything into one line.
          // Trim from right first, then middle, then left.
          const totalWidth =
            visibleWidth(plainLeft) +
            visibleWidth(plainDivider) +
            visibleWidth(plainMid) +
            visibleWidth(plainRight);
          const overflow = Math.max(0, totalWidth - width);
          const rightTargetWidth = Math.max(0, visibleWidth(plainRight) - overflow);
          const rightText = truncateToWidth(plainRight, rightTargetWidth, "");

          const remainingAfterRight = Math.max(0, width - visibleWidth(rightText));
          const midAndDividerWidth = visibleWidth(plainDivider) + visibleWidth(plainMid);
          const midAndDividerTargetWidth = Math.min(midAndDividerWidth, remainingAfterRight);
          const dividerWidth = visibleWidth(plainDivider);
          const dividerText = midAndDividerTargetWidth >= dividerWidth ? plainDivider : "";
          const midTargetWidth = Math.max(0, midAndDividerTargetWidth - visibleWidth(dividerText));
          const midText = truncateToWidth(plainMid, midTargetWidth, "");

          const remainingAfterMid = Math.max(
            0,
            remainingAfterRight - visibleWidth(dividerText) - visibleWidth(midText),
          );
          const leftText = truncateToWidth(plainLeft, remainingAfterMid, "");

          // If the session label survived truncation, render it as a pill.
          // Otherwise tint the whole left area with the theme accent.
          const styledLeft = leftText.includes(sessionLabel)
            ? leftText.replace(sessionLabel, styleSessionPill(sessionLabel))
            : theme.fg("accent", leftText);

          const styledRight = rightText.includes(blurt)
            ? rightText.replace(blurt, styleBlurtText(blurt, blurtTextColor))
            : rightText;

          return [styledLeft + dividerText + rainbowText(midText, frame + 7) + styledRight];
        },
      };
    });
  };

  pi.on("session_start", async (_event, ctx) => {
    botBlurts = loadBotBlurts();
    blurtIndex = 0;
    blurtTextColor = randomBlurtTextColor();
    if (enabled) {
      applyFooter(ctx);
    }
  });

  pi.on("agent_end", async (_event, ctx) => {
    if (!CONFIG.rotateOnAgentEnd || botBlurts.length === 0) return;
    blurtIndex = (blurtIndex + 1) % botBlurts.length;
    blurtTextColor = randomBlurtTextColor();
    if (enabled) applyFooter(ctx);
  });

  pi.registerCommand("chaos-footer", {
    description: "Toggle an animated rainbow footer",
    handler: async (_args, ctx) => {
      enabled = !enabled;
      if (enabled) {
        applyFooter(ctx);
        ctx.ui.notify(CONFIG.messages.enabled, "info");
      } else {
        ctx.ui.setFooter(undefined);
        ctx.ui.notify(CONFIG.messages.restored, "info");
      }
    },
  });

  pi.registerCommand("chaos-footer-off", {
    description: "Restore the default footer",
    handler: async (_args, ctx) => {
      enabled = false;
      ctx.ui.setFooter(undefined);
      ctx.ui.notify(CONFIG.messages.restored, "info");
    },
  });

  pi.registerCommand("chaos-footer-on", {
    description: "Enable the animated rainbow footer",
    handler: async (_args, ctx) => {
      enabled = true;
      applyFooter(ctx);
      ctx.ui.notify(CONFIG.messages.enabled, "info");
    },
  });
}
