<script lang="ts">
  import { marked } from 'marked';
  // A type definition for our message structure. This is good TypeScript practice.
  type Message = {
    role: 'user' | 'assistant';
    content: string;
  };

  let currentMessage: string = '';
  // We start with just the initial greeting. The rest will be added dynamically.
  let chatHistory: Message[] = [
    { role: 'assistant', content: 'Hello! I am the Cashflow Depot assistant. Ask me anything.' }
  ];
  let isLoading: boolean = false; // A variable to track if we're waiting for the API.

  // This is the function that runs when you hit "Send".
   async function handleSubmit() {
    if (!currentMessage.trim() || isLoading) return;

    // --- Setup is the same ---
    const userMessage: Message = { role: 'user', content: currentMessage };
    chatHistory = [...chatHistory, userMessage];
    const question = currentMessage;
    // We send the history *before* the user's current message and the blank assistant message.
    const historyForApi = chatHistory.slice(0, -1); 
    currentMessage = '';
    isLoading = true;

    // --- The new streaming logic starts here ---
    // 1. Add a blank placeholder for the assistant's response.
    chatHistory = [...chatHistory, { role: 'assistant', content: '' }];
    
    try {
      const response = await fetch('http://127.0.0.1:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question,
          chat_history: historyForApi,
        }),
      });

      if (!response.body) {
        throw new Error("Response has no body");
      }

      // 2. Get the tools to read the stream.
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // 3. Read the stream token by token.
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // The stream is finished.
          break;
        }
        const token = decoder.decode(value);
        // 4. Append each new token to the content of the last message in our array.
        // Svelte's reactivity will update the UI automatically.
        chatHistory[chatHistory.length - 1].content += token;
      }

    } catch (error) {
      // If something goes wrong, update the placeholder with an error message.
      chatHistory[chatHistory.length - 1].content = "Sorry, I've run into an error. Please try again.";
      console.error("Failed to fetch stream from chat API:", error);
    } finally {
      isLoading = false; // We're done, whether it succeeded or failed.
    }
  }
</script>

<div class="flex flex-col h-screen max-w-3xl mx-auto p-4 bg-gray-900 text-gray-100">
  
  <div class="flex-grow overflow-y-auto mb-6 p-4 rounded-lg bg-gray-800">
    {#each chatHistory as message}
      <div class="mb-4 {message.role === 'user' ? 'text-right' : 'text-left'}">
        <span class="inline-block px-4 py-2 rounded-lg {message.role === 'user' ? 'bg-blue-600' : 'bg-gray-600'}">
          {@html marked(message.content)}
        </span>
      </div>
    {/each}
  </div>

<form class="flex" on:submit|preventDefault={handleSubmit}>    <input
      type="text"
      bind:value={currentMessage}
      class="flex-grow p-2 rounded-l-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
      placeholder="Ask a question..."
    />
    <button
      type="submit"
      class="btn btn-primary"
      disabled={isLoading}
    >
      {#if isLoading}
        <span class="loading loading-spinner"></span>
      {:else}
        Send
      {/if}
    </button>
  </form>

</div>