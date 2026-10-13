type VibrateBridge = { vibrate?: (ms: number) => void };

function getBridge(): VibrateBridge | undefined {
	return (window as unknown as { FreeGrindBridge?: VibrateBridge }).FreeGrindBridge;
}

/**
 * Fires a haptic buzz, preferring the native `FreeGrindBridge` exposed by the
 * Android and iOS hosts and falling back to `navigator.vibrate` when no bridge
 * is present.
 *
 * The check is explicit on purpose. The previous call shape was
 * `bridge?.vibrate?.(ms) ?? navigator.vibrate?.(ms)`, which looks like a
 * fallback but is not one: the native `vibrate` is a Kotlin `Unit`-returning
 * method, so even a successful call evaluates to `undefined` and `??` would run
 * the fallback as well. On Android — where the bridge *is* registered
 * (`addJavascriptInterface(JsBridge(), "FreeGrindBridge")`) — every haptic
 * therefore fired twice.
 *
 * @param ms duration handed to the native bridge
 * @param fallbackPattern pattern handed to `navigator.vibrate` when the bridge
 *   is unavailable; defaults to `ms`
 */
export function vibrate(ms: number, fallbackPattern: number | number[] = ms) {
	const bridge = getBridge();
	if (typeof bridge?.vibrate === "function") {
		bridge.vibrate(ms);
		return;
	}

	try {
		navigator.vibrate?.(fallbackPattern);
	} catch {
		// Some webviews throw when the page has no user activation yet. Haptics
		// are cosmetic, so this must never bubble up.
	}
}
