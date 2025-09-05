# main.py

# --- Core Python Imports ---
import os
from typing import List, Dict
from operator import itemgetter

# --- Library Imports ---
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv
from pinecone import Pinecone
from langchain_pinecone import PineconeVectorStore
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from fastapi.responses import StreamingResponse
import asyncio

# --- SETUP: Load environment variables ---
# This must run before any clients that need API keys are initialized.
load_dotenv()

# --- GLOBAL CLIENTS & MODELS ---
# These are initialized once when the server starts up. This is efficient
# because they are reused across all API requests without being re-created.
llm = ChatOpenAI(
    model="gpt-5",
    temperature=0,
    api_key=os.environ.get("OPENAI_API_KEY")
)
embeddings = OpenAIEmbeddings(
    model="text-embedding-3-large",
    api_key=os.environ.get("OPENAI_API_KEY")
)
pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
index_name = os.environ.get("PINECONE_INDEX_NAME")
pinecone_index = pc.Index(index_name)
vector_store = PineconeVectorStore(index=pinecone_index, embedding=embeddings)


# --- DATA MODELS ---
# This defines the required structure for the JSON body of incoming POST requests.
class ChatRequest(BaseModel):
    question: str
    chat_history: List[Dict[str, str]]  # e.g., [{"role": "user", "content": "hi"}, ...]


# --- FASTAPI APP INSTANCE ---
app = FastAPI()
# This is the CORS middleware that gives your frontend permission to talk to the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # The origin of your SvelteKit dev server
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)


# --- API ENDPOINTS ---
@app.get("/")
def read_root():
    """ A simple health check endpoint to confirm the API is running. """
    return {"status": "online", "message": "API is ready. Use the /chat endpoint."}



@app.post("/chat")
async def process_chat(request: ChatRequest):
    """
    Processes a chat request and streams the response back token by token.
    """
    
    # We create an inner async generator function. This is where the real work happens.
    async def stream_generator():
        retriever = vector_store.as_retriever()

        SYSTEM_TEMPLATE = """
        You are a financial analyst and a helpful assistant. Your user is asking questions about investment strategies based on the provided context from a set of financial letters.
        
        Answer the user's question using only the provided context. If the context doesn't contain the answer, state that you don't have enough information.
        Be thorough and provide detailed, actionable insights based on the documents. Do not mention the source document IDs in your answer. Write in Markdown. Start a new paragraph with a blank line between paragraphs. Use lists or bullets.

        Context:
        {context}
        """

        prompt = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_TEMPLATE),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
        ])

        rag_chain = (
            {
                "context": itemgetter("input") | retriever,
                "input": itemgetter("input"),
                "chat_history": itemgetter("chat_history"),
            }
            | prompt
            | llm
            | StrOutputParser()
        )

        # Use .astream() for an asynchronous stream of response tokens.
        async for token in rag_chain.astream({
            "input": request.question,
            "chat_history": request.chat_history
        }):
            # Yield each token as it's generated. This sends it to the client immediately.
            yield token
            await asyncio.sleep(0) # Allows other tasks to run if needed.

    # Return a StreamingResponse, which takes our generator and serves it.
    return StreamingResponse(stream_generator(), media_type="text/plain")


