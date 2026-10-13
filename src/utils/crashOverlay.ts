/**
 * Renders fatal errors directly into the DOM via vanilla JS so they remain visible
 * even if React itself has crashed and got destroyed (black screen), tho this works 50/50
 */

let overlayEl: HTMLDivElement | null = null;
const seenMessages = new Set<string>();

/**
 * Removes the overlay so a healthy UI underneath becomes usable again.
 * Also clears the dedupe set, so the same error can be surfaced a second time
 * if it happens again after the user has dismissed it.
 */
export function dismissCrashOverlay() {
	if (!overlayEl) return;
	overlayEl.remove();
	overlayEl = null;
	seenMessages.clear();
}

/**
 * True once React has rendered something into the app root. Used to tell a
 * genuinely fatal boot failure (nothing on screen, so an overlay costs nothing)
 * apart from a stray rejection in an app the user can still use.
 */
function hasMountedUi(): boolean {
	const root = document.getElementById("app");
	return !!root && root.childElementCount > 0;
}

function ensureOverlay(): HTMLDivElement {
	if (overlayEl) return overlayEl;

	const el = document.createElement("div");
	el.id = "crash-overlay";
	el.style.position = "fixed";
	el.style.inset = "0";
	el.style.zIndex = "2147483647";
	el.style.background = "rgba(20, 0, 0, 0.95)";
	el.style.color = "#fff";
	el.style.fontFamily = "monospace";
	el.style.fontSize = "12px";
	el.style.lineHeight = "1.4";
	el.style.padding = "calc(env(safe-area-inset-top, 0px) + 16px) 12px 16px 12px";
	el.style.overflow = "auto";
	el.style.whiteSpace = "pre-wrap";
	el.style.wordBreak = "break-word";
	el.style.pointerEvents = "auto";

	// The overlay sits above the whole app and takes pointer events, so without
	// a way out a non-fatal error would leave the user with an unusable app.
	const dismiss = document.createElement("button");
	dismiss.type = "button";
	dismiss.textContent = "Dismiss";
	dismiss.style.position = "sticky";
	dismiss.style.top = "0";
	dismiss.style.marginBottom = "12px";
	dismiss.style.padding = "6px 12px";
	dismiss.style.fontFamily = "inherit";
	dismiss.style.fontSize = "12px";
	dismiss.style.color = "#fff";
	dismiss.style.background = "rgba(255, 255, 255, 0.14)";
	dismiss.style.border = "1px solid rgba(255, 255, 255, 0.35)";
	dismiss.style.borderRadius = "6px";
	dismiss.style.cursor = "pointer";
	dismiss.addEventListener("click", () => dismissCrashOverlay());
	el.appendChild(dismiss);

	document.body.appendChild(el);
	overlayEl = el;
	return el;
}

export function showCrashOverlay(title: string, detail?: string) {
	const key = `${title}\n${detail ?? ""}`;
	if (seenMessages.has(key)) return;
	seenMessages.add(key);

	const el = ensureOverlay();

	const block = document.createElement("div");
	block.style.marginBottom = "12px";
	block.style.paddingBottom = "12px";
	block.style.borderBottom = "1px solid rgba(255,255,255,0.2)";

	const titleEl = document.createElement("div");
	titleEl.style.fontWeight = "bold";
	titleEl.style.color = "#ff6b6b";
	titleEl.textContent = title;
	block.appendChild(titleEl);

	if (detail) {
		const detailEl = document.createElement("div");
		detailEl.style.marginTop = "4px";
		detailEl.style.opacity = "0.85";
		detailEl.textContent = detail;
		block.appendChild(detailEl);
	}

	el.appendChild(block);
}

export function installGlobalCrashHandlers() {
	if (typeof window === "undefined") return;

	window.addEventListener("error", (event) => {
		showCrashOverlay(
			`Uncaught error: ${event.message}`,
			event.error?.stack ?? `${event.filename}:${event.lineno}:${event.colno}`,
		);
	});

	window.addEventListener("unhandledrejection", (event) => {
		const reason = event.reason;
		const message = reason instanceof Error ? reason.message : String(reason);
		const stack = reason instanceof Error ? reason.stack : undefined;

		// A stray rejection is not necessarily fatal — plenty of
		// fire-and-forget calls (settings reads, background syncs) reject for
		// reasons the app already recovers from. Covering a perfectly usable UI
		// with an opaque, input-blocking panel turns a cosmetic problem into an
		// unusable app, so only surface it when there is no UI to protect,
		// i.e. React never managed to mount.
		if (hasMountedUi()) {
			console.error(`[crash-overlay] unhandled rejection (non-fatal): ${message}`, reason);
			return;
		}

		showCrashOverlay(`Unhandled rejection: ${message}`, stack);
	});

	window.addEventListener("keydown", (event) => {
		if (event.key === "Escape") {
			dismissCrashOverlay();
		}
	});
}
