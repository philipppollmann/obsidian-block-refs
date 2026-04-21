import { EditorView, ViewPlugin } from "@codemirror/view";
import type BlockRefsPlugin from "../main";

/**
 * Registers tag click interception using three strategies:
 *
 * 1. Markdown post-processor: replaces <a> tag elements with <span> in
 *    Reading mode to prevent Obsidian from opening search.
 *
 * 2. CM6 EditorView plugin: intercepts clicks on .cm-hashtag elements
 *    in Live Preview mode.
 *
 * 3. Capture-phase DOM fallback for any remaining cases.
 */
export function registerTagClickHandler(plugin: BlockRefsPlugin): void {
	// ── Strategy 1: Reading mode (post-processor) ──
	plugin.registerMarkdownPostProcessor((el) => {
		const tags = el.querySelectorAll("a.tag");
		for (let i = 0; i < tags.length; i++) {
			const anchor = tags[i] as HTMLAnchorElement;
			const tag = anchor.textContent?.trim();
			if (!tag) continue;

			const span = document.createElement("span");
			span.className = anchor.className;
			span.textContent = anchor.textContent;

			span.addEventListener("click", (evt) => {
				if (!plugin.settings.overrideTagClick) return;
				evt.preventDefault();
				evt.stopImmediatePropagation();
				plugin.activateView(tag);
			});

			anchor.replaceWith(span);
		}
	});

	// ── Strategy 2: Live Preview (CM6 editor extension) ──
	const tagClickPlugin = ViewPlugin.fromClass(
		class {
			private handler: (evt: MouseEvent) => void;

			constructor(view: EditorView) {
				this.handler = (evt: MouseEvent) => {
					if (!plugin.settings.overrideTagClick) return;

					const target = evt.target as HTMLElement;
					if (!target.classList.contains("cm-hashtag")) return;

					evt.preventDefault();
					evt.stopImmediatePropagation();

					const tag = resolveHashtagFromCM(target);
					if (tag) {
						plugin.activateView(tag);
					}
				};

				view.dom.addEventListener("click", this.handler, {
					capture: true,
				});
			}

			destroy() {
				// Cleanup not strictly needed since the EditorView removes the DOM,
				// but good practice
			}
		}
	);

	plugin.registerEditorExtension([tagClickPlugin]);

	// ── Strategy 3: Document-level fallback (capture phase) ──
	const fallbackHandler = (evt: MouseEvent) => {
		if (!plugin.settings.overrideTagClick) return;

		const target = evt.target as HTMLElement;

		// Fallback for any a.tag that the post-processor missed
		const tagAnchor = target.closest("a.tag") as HTMLElement | null;
		if (tagAnchor) {
			const tag = tagAnchor.textContent?.trim();
			if (tag) {
				evt.preventDefault();
				evt.stopImmediatePropagation();
				plugin.activateView(tag);
			}
		}
	};

	document.addEventListener("click", fallbackHandler, { capture: true });
	plugin.register(() =>
		document.removeEventListener("click", fallbackHandler, {
			capture: true,
		})
	);
}

/**
 * In CodeMirror 6 (Live Preview), a tag like #example is rendered as
 * two adjacent spans:
 *   <span class="cm-hashtag cm-hashtag-begin cm-meta">#</span>
 *   <span class="cm-hashtag cm-hashtag-end cm-meta">example</span>
 */
function resolveHashtagFromCM(el: HTMLElement): string | null {
	let parts: string[] = [];

	if (el.classList.contains("cm-hashtag-begin")) {
		let current: Element | null = el;
		while (current && current.classList.contains("cm-hashtag")) {
			parts.push(current.textContent || "");
			current = current.nextElementSibling;
		}
	} else if (el.classList.contains("cm-hashtag-end")) {
		const siblings: string[] = [];
		let prev: Element | null = el.previousElementSibling;
		while (prev && prev.classList.contains("cm-hashtag-begin")) {
			siblings.unshift(prev.textContent || "");
			prev = prev.previousElementSibling;
		}
		parts = [...siblings, el.textContent || ""];

		let next: Element | null = el.nextElementSibling;
		while (next && next.classList.contains("cm-hashtag-end")) {
			parts.push(next.textContent || "");
			next = next.nextElementSibling;
		}
	}

	const tag = parts.join("").trim();
	return tag || null;
}
