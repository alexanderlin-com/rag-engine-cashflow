# import basics
import os
import time
from dotenv import load_dotenv

# NEW IMPORT: tenacity for robust retries
from tenacity import retry, stop_after_attempt, wait_exponential, RetryError

# import pinecone
from pinecone import Pinecone, ServerlessSpec

# import langchain
from langchain_pinecone import PineconeVectorStore
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document

#documents
from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))

# initialize pinecone database
index_name = os.environ.get("PINECONE_INDEX_NAME")

# check whether index exists, and create if not
existing_indexes = [index_info["name"] for index_info in pc.list_indexes()]

if index_name not in existing_indexes:
    pc.create_index(
        name=index_name,
        dimension=3072, # Make sure this matches your embedding model
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1"),
    )
    while not pc.describe_index(index_name).status["ready"]:
        time.sleep(1)

index = pc.Index(index_name)

# initialize embeddings model + vector store
embeddings = OpenAIEmbeddings(model="text-embedding-3-large", api_key=os.environ.get("OPENAI_API_KEY"))

# We'll initialize vector_store here, but add documents in a loop
vector_store = PineconeVectorStore(index=index, embedding=embeddings)


# loading the PDF document
loader = PyPDFDirectoryLoader("documents/")
raw_documents = loader.load()

# splitting the document
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=400,
    length_function=len,
    is_separator_regex=False,
)

print(f"Found {len(raw_documents)} raw documents to process.")

# Define the retriable function for adding chunks
@retry(
    stop=stop_after_attempt(7),  # Try up to 7 times (increased from 5 for more robustness)
    wait=wait_exponential(multiplier=1, min=4, max=60), # Wait 4s, 8s, 16s, etc., up to 60s
    rraise=True, # Re-raise the exception if all retries fail
    # Retry on common network/API exceptions
    retry=(
        BrokenPipeError,
        urllib3.exceptions.ProtocolError,
        # Add OpenAI-specific exceptions if you encounter them often, e.g.:
        # openai.APITimeoutError,
        # openai.RateLimitError,
        # requests.exceptions.ConnectionError, # If you have requests directly in your stack
    )
)
def add_chunks_with_retry(chunks, ids):
    """Function to add document chunks to vector store with retries."""
    vector_store.add_documents(documents=chunks, ids=ids)


# Process and ingest each document individually for progress feedback
total_documents = len(raw_documents)
for i, raw_doc in enumerate(raw_documents):
    file_name = os.path.basename(raw_doc.metadata.get('source', f"document_{i+1}.pdf"))
    print(f"Ingesting {i+1}/{total_documents}: {file_name}...")

    # Split the current raw document into chunks
    document_chunks = text_splitter.split_documents([raw_doc])

    # Generate unique IDs for these chunks
    # Ensure IDs are truly unique, perhaps include a timestamp or hash for production
    uuids_for_doc = [f"{file_name.replace('.', '_').replace(' ', '')}_chunk_{j}" for j in range(len(document_chunks))]

    if not document_chunks:
        print(f"Skipping {file_name}: No text chunks extracted.")
        continue # Skip to the next document

    try:
        # Call the retriable function
        add_chunks_with_retry(document_chunks, uuids_for_doc)
        print(f"Successfully ingested {len(document_chunks)} chunks from {file_name}.")
    except RetryError as e:
        print(f"Failed to ingest {file_name} after multiple retries. This document might need manual review: {e}")
    except Exception as e:
        print(f"An unexpected error occurred ingesting {file_name}: {e}")

print("Ingestion complete for all documents.")
