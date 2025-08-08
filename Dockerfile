# Use a lean, mean Python base image. No bloat.
FROM python:3.11-slim

# Set the working directory inside the container. This is your gym.
WORKDIR /app

# Copy the list of what you need...
COPY requirements.txt .

# ...then install it. Use --no-cache-dir to keep the image small.
# Don't be sloppy.
RUN pip install --no-cache-dir -r requirements.txt

# Now copy the rest of your code in.
COPY . .

# Tell the world what door to knock on. Streamlit lives on 8501.
EXPOSE 8501

# Healthcheck to make sure the app is actually running before calling it healthy.
# Don't just assume it works. PROVE IT.
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8501/_stcore/health || exit 1

# This is how you run the damn thing.
# The --server.address=0.0.0.0 part is non-negotiable. It makes the app listen
# to requests from outside the container, not just from itself.
CMD ["streamlit", "run", "chatbot_rag.py", "--server.port=8501", "--server.address=0.0.0.0"]