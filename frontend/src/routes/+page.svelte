import { marked } from 'marked';
<script lang="ts">
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
    // Don't do anything if the message is empty or if we're already waiting for a response.
    if (!currentMessage.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: currentMessage };
    // Immediately add the user's message to the chat history for a snappy UI.
    chatHistory = [...chatHistory, userMessage];
    
    // Prepare the data to send to the backend.
    const question = currentMessage;
    const historyForApi = chatHistory.slice(0, -1); // Send all messages *before* the current one.
    
    currentMessage = ''; // Clear the input box.
    isLoading = true;

    // Make the API call to your FastAPI backend.
    try {
      const response = await fetch('http://127.0.0.1:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question,
          chat_history: historyForApi,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const data = await response.json();
      const assistantResponse: Message = { role: 'assistant', content: data.answer };

      // Add the AI's response to the chat history.
      chatHistory = [...chatHistory, assistantResponse];
    } catch (error) {
      const errorResponse: Message = { role: 'assistant', content: "Sorry, I've run into an error. Please try again." };
      chatHistory = [...chatHistory, errorResponse];
      console.error("Failed to fetch from chat API:", error);
    } finally {
      isLoading = false; // We're done loading, whether it succeeded or failed.
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
    <button type="submit" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-r-lg font-bold">
      Send
    </button>
  </form>

</div>