# Cashflow Depot RAG
*Built from a tutorial. Broken. Rebuilt for scale, speed, and sanity.*

---

## 🚀 What This Is

A Retrieval-Augmented Generation (RAG) chatbot powered by:

- **LangChain** for prompt/tool orchestration  
- **Pinecone** for vector search  
- **OpenAI** for LLM output  
- **Streamlit** for frontend  

Forked from [original tutorial repo link], then *modified like hell* to work with real-world doc loads (300+ PDFs), forward-compatible Python versions, and tighter dev loops.

---

## 🔨 Major Improvements Over the Original

| Area              | Original            | My Upgrade                               |
|-------------------|---------------------|-------------------------------------------|
| Ingestion UX      | Silent, brittle     | Credential check + progress bar           |
| Input Handling    | Loose single-PDF    | Folder-based recursive doc loader         |
| Prompt Quality    | Shallow responses   | Deep, customized LLM system prompt        |
| Python Compatibility | Python ≤3.10    | Fully working on 3.13                     |
| Frontend          | Stock tutorial      | Branded & modified                        |
| Cleanup           | None                | `deingestion.py` kills your stale indexes |

---

## 🧠 Why I Made These Changes

### ✅ Credential Awareness  
Because eating a stack trace when your env isn’t set is trash. I made it fail loud and clear.

### ✅ Folder-Based Ingestion  
Tutorials are fine with 2 docs. I had **300+**. Subfolder crawl was non-negotiable.

### ✅ Progress Bar for Ingestion  
Because nothing feels worse than staring at your terminal, wondering if it died. Now you get live feedback.

### ✅ Python 3.13 Compatibility  
I live on the bleeding edge. I fix what breaks. You’re welcome.

### ✅ Prompt Engineering  
The default prompt gave me canned garbage. I rewrote it to force thoughtful, long-form answers tuned to my use case.

### ✅ De-Ingestion Script  
Pinecone ain’t free. If you’re iterating, you *need* index deletion on command. So I made it easy.

---

## 📂 Folder Structure


📁 rag-agent/
├── chatbot.py
├── ingestion.py
├── deingestion.py
├── requirements.txt
├── .env
└── ...



---

## 🛠️ Setup & Run

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/rag-agent
cd rag-agent

# 2. Set up your environment
cp .env.example .env  # then fill in OpenAI & Pinecone keys

# 3. Ingest your docs
python ingestion.py

# 4. Run the chatbot
streamlit run chatbot.py

# Nuking the Index (Optional)
python deingestion.py
```
Because sometimes you just want to burn it all down.
