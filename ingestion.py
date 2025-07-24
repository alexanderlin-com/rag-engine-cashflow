# import basics
import os
import time
from dotenv import load_dotenv
import uuid  # Look, something new for you to learn.
from tqdm import tqdm # To see your progress, so you don't get impatient.

# import pinecone
from pinecone import Pinecone, ServerlessSpec

# import langchain
from langchain_pinecone import PineconeVectorStore
from langchain_openai import OpenAIEmbeddings

#documents
from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv() 

# --- Database and Embeddings Setup ---
# (Your existing setup code is fine, if a little verbose)
pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
index_name = os.environ.get("PINECONE_INDEX_NAME")

if index_name not in pc.list_indexes().names():
    print(f"Index '{index_name}' not found. Creating it... might take a minute.")
    pc.create_index(
        name=index_name,
        dimension=3072,  # Match your OpenAI model's dimension
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1"),
    )
    while not pc.describe_index(index_name).status["ready"]:
        time.sleep(1)

index = pc.Index(index_name)
embeddings = OpenAIEmbeddings(model="text-embedding-3-large", api_key=os.environ.get("OPENAI_API_KEY"))
vector_store = PineconeVectorStore(index=index, embedding=embeddings)


# --- Document Loading and Splitting ---
print("Loading documents from the 'documents/' folder...")
loader = PyPDFDirectoryLoader("documents/")
raw_documents = loader.load()

if not raw_documents:
    print("No documents found. Put some PDFs in the 'documents' folder, genius.")
    exit()

print(f"Loaded {len(raw_documents)} document(s). Splitting into chunks...")
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=200, # 400 is a bit much, try 200.
    length_function=len,
)
documents = text_splitter.split_documents(raw_documents)
print(f"Created {len(documents)} text chunks.")


# --- Batching and Uploading ---
# This is the part you actually need to learn.
def batch_generator(data, batch_size):
    for i in range(0, len(data), batch_size):
        yield data[i:i + batch_size]

BATCH_SIZE = 100 # Adjust this based on your document size and network.

print(f"Starting ingestion in batches of {BATCH_SIZE}...")

for batch in tqdm(batch_generator(documents, BATCH_SIZE), total=(len(documents) // BATCH_SIZE) + 1):
    # Create REAL unique IDs for this batch
    ids = [str(uuid.uuid4()) for _ in batch]
    
    # Add documents to the vector store
    vector_store.add_documents(documents=batch, ids=ids)

print("\nIngestion complete. You're welcome.")