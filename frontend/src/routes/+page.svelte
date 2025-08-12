<script lang="ts">
	import { marked } from 'marked';
	import { onMount, afterUpdate } from 'svelte';

	// Type definition for our message structure.
	type Message = {
		role: 'user' | 'assistant';
		content: string;
	};

	let currentMessage: string = '';
	let chatHistory: Message[] = [
		{ role: 'assistant', content: 'Hello! I am the Cashflow Depot assistant. Ask me anything.' }
	];
	let isLoading: boolean = false;
	let chatContainer: HTMLElement; // A reference to the chat's scrollable container.

	// This function scrolls the chat to the bottom.
	function scrollToBottom() {
		if (chatContainer) {
			chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
		}
	}

	// Scroll to bottom whenever the chat history changes.
	afterUpdate(scrollToBottom);

	async function handleSubmit() {
		if (!currentMessage.trim() || isLoading) return;

		const userMessage: Message = { role: 'user', content: currentMessage };
		chatHistory = [...chatHistory, userMessage];

		const question = currentMessage;
		const historyForApi = chatHistory.slice(0, -1);
		
		currentMessage = '';
		isLoading = true;

		// Add a blank placeholder for the assistant's response.
		chatHistory = [...chatHistory, { role: 'assistant', content: '' }];
		
		try {
			const response = await fetch('http://127.0.0.1:8000/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					question: question,
					chat_history: historyForApi
				})
			});

			if (!response.body) throw new Error('Response has no body');

			const reader = response.body.getReader();
			const decoder = new TextDecoder();

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				
				const token = decoder.decode(value);
				chatHistory[chatHistory.length - 1].content += token;
			}
		} catch (error) {
			chatHistory[chatHistory.length - 1].content =
				'Sorry, an error occurred. Please try again.';
			console.error('Failed to fetch stream from chat API:', error);
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="flex flex-col h-screen max-w-3xl mx-auto p-4">
	<header class="text-center mb-6 pt-4">
		<h1 class="text-3xl font-bold">Cashflow Depot Assistant</h1>
	</header>

	<div bind:this={chatContainer} class="flex-grow overflow-y-auto mb-6 p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
		{#each chatHistory as message, i (i)}
			<div class="mb-4 {message.role === 'user' ? 'text-right' : 'text-left'}">
				{#if message.role === 'user'}
					<span class="inline-block px-4 py-2 rounded-lg bg-blue-600 text-white">
						{message.content}
					</span>
				{:else}
					<div class="prose dark:prose-invert max-w-none">
						{@html marked(message.content)}
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<form class="flex" on:submit|preventDefault={handleSubmit}>
		<input
			type="text"
			bind:value={currentMessage}
			class="flex-grow p-2 rounded-l-lg bg-gray-200 dark:bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
			placeholder="Ask a question..."
			disabled={isLoading}
		/>
		<button type="submit" class="btn btn-primary rounded-l-none" disabled={isLoading}>
			{#if isLoading}
				<span class="loading loading-spinner" />
			{:else}
				Send
			{/if}
		</button>
	</form>
</div>