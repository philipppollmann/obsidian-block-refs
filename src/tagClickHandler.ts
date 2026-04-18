import type BlockRefsPlugin from "../main";

/**
 * Registers DOM event handlers to intercept tag clicks.
 *
 * - Reading mode: regular click on tag opens Block Refs view
 * - Live Preview: Ctrl/Cmd+click on tag opens Block Refs view
 *   (regular click positions cursor, which we don't interfere with)
 */
export function registerTagClickHandler(plugin: BlockRefsPlugin): void {
	plugin.registerDomEvent(document, "click", (evt: MouseEvent) => {
		if (!plugin.settings.overrideTagClick) return;

		const target = evt.target as HTMLElement;

		// Reading mode: <a class="tag" href="#tagname">#tagname</a>
		if (target.matches("a.tag")) {
			const tag = target.textContent?.trim();
			if (tag) {
				evt.preventDefault();
				evt.stopPropagation();
				plugin.activateView(tag);
			}
			return;
		}

		// Live Preview: elements with cm-hashtag class
		// Only intercept with Ctrl (Win/Linux) or Cmd (Mac) held
		if (
			target.matches(".cm-hashtag") &&
			(evt.ctrlKey || evt.metaKey)
		) {
			evt.preventDefault();
			const tag = resolveHashtagFromCM(target);
			if (tag) {
				plugin.activateView(tag);
			}
			return;
		}
	});
}

/**
 * In CodeMirror 6 (Live Preview), a tag like #example is rendered as
 * two adjacent spans:
 *   <span class="cm-hashtag cm-hashtag-begin cm-meta">#</span>
 *   <span class="cm-hashtag cm-hashtag-end cm-meta">example</span>
 *
 * This function reconstructs the full tag text from either span.
 */
function resolveHashtagFromCM(el: HTMLElement): string | null {
	let parts: string[] = [];

	if (el.classList.contains("cm-hashtag-begin")) {
		// Clicked on the "#" — collect forward
		let current: Element | null = el;
		while (current && current.classList.contains("cm-hashtag")) {
			parts.push(current.textContent || "");
			current = current.nextElementSibling;
		}
	} else if (el.classList.contains("cm-hashtag-end")) {
		// Clicked on the tag name — collect backwards for "#", then forward
		const siblings: string[] = [];
		let prev: Element | null = el.previousElementSibling;
		while (prev && prev.classList.contains("cm-hashtag-begin")) {
			siblings.unshift(prev.textContent || "");
			prev = prev.previousElementSibling;
		}
		parts = [...siblings, el.textContent || ""];

		// Also collect any further cm-hashtag-end siblings (nested tags like #tag/sub)
		let next: Element | null = el.nextElementSibling;
		while (next && next.classList.contains("cm-hashtag-end")) {
			parts.push(next.textContent || "");
			next = next.nextElementSibling;
		}
	}

	const tag = parts.join("").trim();
	return tag || null;
}
