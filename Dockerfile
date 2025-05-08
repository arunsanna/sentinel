FROM python:3.11-slim

WORKDIR /app

# Install git (needed for GitPython)
RUN apt-get update && apt-get install -y git && apt-get clean

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Create necessary directories
RUN mkdir -p data modules static templates

# Expose the Flask port
EXPOSE 5000

# Command to run the application
CMD ["python", "app.py"]
