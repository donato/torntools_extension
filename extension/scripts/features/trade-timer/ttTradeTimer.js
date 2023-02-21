"use strict";

(async () => {
	featureManager.registerFeature(
		"Trade Timer",
		"chat",
		() => settings.pages.chat.tradeTimer,
		initialise,
		detectChat,
		cleanup,
		{
			storage: ["settings.pages.chat.tradeTimer", "localdata.tradeMessage"],
		},
		null
	);

	function initialise() {
		CUSTOM_LISTENERS[EVENT_CHANNELS.CHAT_OPENED].push(({ chat }) => {
			if (!chat.classList.contains("^=_trade_")) return;

			triggerTrade(chat);
		});
	}

	async function detectChat() {
		await requireChatsLoaded();

		const chat = document.find("#chatRoot [class*='_chat-box_'][class*='_trade_'][class*='_chat-active_']");
		if (!chat) return;

		triggerTrade(chat);
	}

	function triggerTrade(chat) {
		const input = chat.find("[class*='_chat-box-input_']");

		let timer = input.find("#tt-trade-timer");
		if (!timer) {
			timer = document.newElement({
				type: "div",
				id: "tt-trade-timer",
				dataset: {
					doneText: "OK",
					timeSettings: JSON.stringify({ type: "wordTimer", extraShort: true }),
				},
			});
			input.insertBefore(document.newElement({ type: "div", children: [timer] }), input.firstElementChild);

			input.find("textarea").addEventListener("keypress", onKeyPress, { capture: true });
			input.classList.add("tt-modified");
		}

		const now = Date.now();
		if (localdata.tradeMessage > now) {
			timer.textContent = formatTime({ milliseconds: localdata.tradeMessage - now }, { type: "wordTimer", extraShort: true });
			timer.dataset.seconds = ((localdata.tradeMessage - now) / TO_MILLIS.SECONDS).dropDecimals().toString();

			// Append new timer to countdown timers only if not already present
			if (!countdownTimers.some((counter) => counter === timer)) countdownTimers.push(timer);
		} else {
			timer.textContent = "OK";
		}

		const search = input.find(".tt-chat-filter");
		if (search) timer.parentElement.appendChild(search);
	}

	async function onKeyPress(event) {
		if (event.key !== "Enter") return;
		if (!event.target.value) return;

		const chat = findParent(event.target, { class: "^=_chat-box_" });
		const overview = chat.find("[class*='_overview_']");

		const message = await new Promise((resolve) => {
			new MutationObserver((mutations, observer) => {
				const msgMutations = mutations.filter((mut) => mut.addedNodes.length);
				if (!msgMutations || !msgMutations.length) return;

				// Find all newly added nodes - chat message nodes and error nodes too
				const node = msgMutations
								.map(mut => [...mut.addedNodes])
								.flat()
								.filter(
									(msg) => msg.children[0]
												.getAttribute("href")
												?.endsWith(userdata.player_id.toString()) ||
											 msg.className.includes("_error_")
									)?.[0];

				observer.disconnect();
				resolve(node);
			}).observe(overview, { childList: true });
		});
		// Maybe not of potential use ?
		// if (event.target.value) return;

		if (message.className.includes("_error_")) return;

		await ttStorage.change({ localdata: { tradeMessage: Date.now() + TO_MILLIS.SECONDS * 61 } });
	}

	function cleanup() {
		const chat = document.find("#chatRoot [class*='_chat-box_'][class*='_trade_'][class*='_chat-active_']");
		if (!chat) return;

		chat.find("#tt-trade-timer")?.remove();

		const input = chat.find("[class*='_chat-box-input_']");

		if (!input.find(".tt-chat-filter")) input.classList.remove("tt-modified");

		input.find("textarea").removeEventListener("keypress", onKeyPress);
	}

	// function moveSearch() {
	// 	const timer = document.find("#tt-trade-timer");
	// 	if (!timer) return;
	//
	// 	const search = timer.parentElement.parentElement.find(".tt-chat-filter");
	// 	if (!search) return;
	//
	// 	timer.parentElement.appendChild(search);
	// }
})();
