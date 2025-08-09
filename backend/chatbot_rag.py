#import streamlit
import streamlit as st
import os
from dotenv import load_dotenv

# import pinecone
from pinecone import Pinecone, ServerlessSpec

# import langchain
from langchain_pinecone import PineconeVectorStore
from langchain_openai import OpenAIEmbeddings
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

load_dotenv()

st.title("Cashflow Depot Chatbot")

# initialize pinecone database
pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))

# initialize pinecone database
index_name = os.environ.get("PINECONE_INDEX_NAME")  # change if desired
index = pc.Index(index_name)

# initialize embeddings model + vector store
embeddings = OpenAIEmbeddings(model="text-embedding-3-large",api_key=os.environ.get("OPENAI_API_KEY"))
vector_store = PineconeVectorStore(index=index, embedding=embeddings)

# initialize chat history
# initialize chat history
if "messages" not in st.session_state:
    st.session_state.messages = []

    # This is your internal instruction to the AI
    st.session_state.messages.append(SystemMessage("You are an assistant for question-answering tasks. "))

    # This is the message the user will see from the bot when they open the app
    st.session_state.messages.append(AIMessage("Hello! I'm your friendly neighborhood Cashflow Depot RAG assistant! Ask me anything related to the Commonwealth Letters, Jack Miller's techniques, or any related topics!"))
# display chat messages from history on app rerun
for message in st.session_state.messages:
    if isinstance(message, HumanMessage):
        with st.chat_message("user"):
            st.markdown(message.content)
    elif isinstance(message, AIMessage):
        with st.chat_message("assistant"):
            st.markdown(message.content)

# create the bar where we can type messages
prompt = st.chat_input("How are you?")

# did the user submit a prompt?
if prompt:
    # Add user message to the session state and display it
    st.session_state.messages.append(HumanMessage(prompt))
    with st.chat_message("user"):
        st.markdown(prompt)

    # --- This is where the real work happens ---

    # 1. Initialize the LLM (you can even do this once outside the loop)
    llm = ChatOpenAI(model="gpt-4o", temperature=0.7) # Temp 1 is for creative writing, not Q&A. Control it.

    # 2. Create the retriever
    retriever = vector_store.as_retriever(
        search_type="similarity_score_threshold",
        search_kwargs={"k": 5, "score_threshold": 0.5}, # K=3 is weak. Let's try 5.
    )

    # 3. Retrieve context FOR THIS PROMPT ONLY
    docs = retriever.invoke(prompt)
    docs_text = "".join(d.page_content for d in docs)

    # 4. Create the one-time system prompt
    system_prompt_template = """You are an assistant for question-answering tasks.
    Use the following pieces of retrieved context to answer the question.
    If you don't know the answer, just say that you don't know.
    Elaborate on the answer with all relevant details from the provided context.
    Context: {context}

    Now, answer the following question based on the context above:"""
    
    system_prompt = system_prompt_template.format(context=docs_text)

    # 5. Create the message payload FOR THIS INVOCATION ONLY
    # DO NOT append the system prompt to the session state.
    messages_for_llm = [
        SystemMessage(content=system_prompt),
    ]
    # Add the last few messages from history for conversational context, if you want.
    # For now, let's just add the most recent human message.
    messages_for_llm.append(HumanMessage(prompt))


    # 6. Invoke the LLM with the clean, temporary payload
    result = llm.invoke(messages_for_llm).content

    # 7. Add only the AI's response to the session state and display it
    st.session_state.messages.append(AIMessage(result))
    with st.chat_message("assistant"):
        st.markdown(result)