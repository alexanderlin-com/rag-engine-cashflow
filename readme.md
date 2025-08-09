# Cashflow Depot RAG
*Built from a tutorial. Broken. Rebuilt for scale, speed, and sanity.*

---

## 🚀 What This Was

A Retrieval-Augmented Generation (RAG) chatbot powered by:

- **LangChain** for prompt/tool orchestration  
- **Pinecone** for vector search  
- **OpenAI** for LLM output  
- **Streamlit** for frontend  

Forked from [LangChain-Pinecone-RAG](https://github.com/ThomasJanssen-tech/LangChain-Pinecone-RAG/tree/main), then *modified like hell* to work with real-world doc loads (300+ PDFs), forward-compatible Python versions, and tighter dev loops.

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

# That was where this project ended. But then I realized the weakness of Streamlit Cloud Free and it disgusted me. 

### ✅ Changed Hosting to Docker+ Google Cloud Run
Streamlit Cloud Free is hard to rely on.

## New Technology Stack

* **Language:** Python 3.11 
* **LLM Framework:** LangChain
* **Frontend:** Streamlit
* **Vector Database:** Pinecone
* **Containerization:** Docker
* **Cloud Platform:** Google Cloud Run (for serving) & Artifact Registry (for image storage)
* **CI/CD:** GitHub Actions

---

## Local Development

Instructions for running the application on your local machine.

## Instructions (for myself) because I need em.

### 1. Environment Setup

**Create Virtual Environment** (do this once):
```bash
python3 -m venv venv
```
**Activate Virtual Environment** (do this every time you open a new terminal for the project):
```
source venv/bin/activate
```

**Install Dependencies:**
```
pip install -r requirements.txt
```

**Environment Variables:**
Copy the ```.env.example``` file to a new file named ```.env``` and fill in your API keys.
```cp .env.example .env```

### 2. Running the Application
You can run the app directly with Streamlit or inside a Docker container.

**With Streamlit:**
streamlit run chatbot_rag.py

**With Docker** (Recommended for testing the production environment):

```
# Build the image
docker build -t cashflow-depot-rag .

# Run the container, passing the .env file for secrets
docker run --rm -p 8501:8501 --env-file .env cashflow-depot-rag
```

## CI/CD Deployment Pipeline

This project is configured with a GitHub Actions workflow that automates deployment. Any push to the ```main``` branch will automatically trigger a new deployment to Google Cloud Run.

The pipeline performs the following steps:

1. Authenticates to Google Cloud using a secure Service Account.

2. Builds the Docker image for a ```linux/amd64``` platform.

3. Pushes the new image to Google Artifact Registry.

4. Deploys the new image as a new revision to the Cloud Run service, injecting the necessary API keys from GitHub Secrets.

## Instructions for Deploying a New, Similar Project

This is your personal checklist for cloning this setup for a new RAG agent.

**Prerequisites**: A new GitHub repository containing your new agent's code, including the ```Dockerfile``` and ```.github/workflows/deploy.yml``` from this project.

**One-Time Setup Per Project:**
**1. Create a new Google Cloud Project.**
```
gcloud projects create YOUR_NEW_PROJECT_ID
gcloud config set project YOUR_NEW_PROJECT_ID
```
**2. Enable Required APIs.**
```
gcloud services enable artifactregistry.googleapis.com run.googleapis.com iamcredentials.googleapis.com cloudresourcemanager.googleapis.com
```

**3. Create an Artifact Registry Repository.**
```
gcloud artifacts repositories create your-new-repo-name --repository-format=docker --location=us-central1
```

**4. Create a Service Account.**
```
gcloud iam service-accounts create github-actions-runner --display-name="GitHub Actions Runner"
```

**5. Grant the Service Account Permissions. (Replace ```YOUR_NEW_PROJECT_ID``` with the actual ID).**
```
PROJECT_ID=YOUR_NEW_PROJECT_ID
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:github-actions-runner@$PROJECT_ID.iam.gserviceaccount.com" --role="roles/artifactregistry.writer"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:github-actions-runner@$PROJECT_ID.iam.gserviceaccount.com" --role="roles/run.admin"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:github-actions-runner@$PROJECT_ID.iam.gserviceaccount.com" --role="roles/iam.serviceAccountUser"
```

**6. Create & Add Secrets to GitHub.**
- Create a JSON key for the service account:
```
gcloud iam service-accounts keys create github-key.json --iam-account="github-actions-runner@$PROJECT_ID.iam.gserviceaccount.com"
```
- Go to your new GitHub repo's Settings > Secrets and variables > Actions and create the following secrets:

    - ```GCP_SA_KEY```: Paste the entire contents of github-key.json.

    - ```GCP_PROJECT_ID```: Paste your new GCP Project ID.

    - ```OPENAI_API_KEY```: Your OpenAI key.

    - ```PINECONE_API_KEY```: Your Pinecone key for the new project.

    - ```PINECONE_INDEX_NAME```: Your Pinecone index name for the new project.

Delete ```github-key.json``` from your computer.

7. Update ```deploy.yml```: In your new project's ```.github/workflows/deploy.yml``` file, update the ```SERVICE_NAME``` environment variable to match your new project's name.

8. Push to ```main``` and watch the magic happen in the Actions tab.

---

