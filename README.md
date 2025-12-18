# Cloud-Based Collaborative Code Editor

This project is a high-performance, real-time collaborative code editor and execution environment designed to function like Replit or VS Code Web. It leverages a microservices architecture to provide a seamless, synchronized experience for multiple users while ensuring secure and isolated code execution using Kubernetes.

## 🚀 Key Features

* **Real-time Multi-user Editing**: Multiple users can edit the same file simultaneously with instant synchronization.
* **Live Cursor & Presence**: See other collaborators' cursors, selections, and user profiles in real-time.
* **Isolated Code Execution**: Every project runs in its own secure container, preventing one user's code from affecting the main system or other users.
* **Integrated Terminal**: A full-featured terminal connected directly to the isolated execution environment.
* **Cloud Persistence**: Automatic saving and loading of project files from S3-compatible storage.

## 🏗️ Architecture & Services

The project follows a secure microservices approach, splitting the workload into specialized components:

### 1. Frontend (React/Next.js)
* **Monaco Editor**: Uses the high-performance code editor engine behind VS Code.
* **Collaboration (Yjs)**: Implements Conflict-Free Replicated Data Types (CRDTs) to ensure all users see the same document state without merge conflicts.
* **Xterm.js**: Renders a fully functional terminal in the browser.

### 2. Orchestrator Service
* **Purpose**: Acts as the management layer that interacts with the Kubernetes cluster.
* **Dynamic Provisioning**: Automatically creates Kubernetes `Deployments`, `Services`, and `Ingress` resources for each unique project session.
* **Safety**: Parses and applies multi-document YAML configurations to ensure every user gets isolated networking and compute resources.

### 3. Init Service
* **Purpose**: Bootstraps new projects by setting up the file system.
* **Template Management**: Copies base language templates (e.g., Node.js, Python) from AWS S3 storage to the specific project's working directory before the session starts.

### 4. Runner Service (Isolated Sandbox)
* **Purpose**: The secure environment where user code executes.
* **WebSockets & PTY**: Runs a WebSocket server inside the container that bridges the frontend terminal to a Pseudo-Terminal (PTY) process.
* **File Operations**: Provides secure APIs for saving and fetching code files within the sandbox.

## 🛠️ Tech Stack

* **Languages**: TypeScript, Node.js
* **Frontend**: React, Monaco Editor, Xterm.js
* **Collaboration**: Yjs (CRDTs), WebSockets
* **Infrastructure**: Kubernetes (K8s), Docker
* **Cloud Services**: AWS S3 (Storage), Redis (Pub/Sub for scaling)
* **Backend Framework**: Express.js

## 🚦 Getting Started

### Prerequisites
* **Docker** & **Kubernetes Cluster** (Minikube or managed provider)
* **Redis** instance (for real-time coordination)
* **AWS S3** bucket (for file persistence)
* **Node.js** (v14+)

### Installation

1.  **Clone the Repository**
    ```bash
    git clone <repository-url>
    cd code-editor-project
    ```

2.  **Build the Runner Image**
    Navigate to the `runner` directory and build the Docker image that will be used for user sessions.
    ```bash
    cd good-code/runner
    docker build -t code-editor-runner .
    ```

3.  **Configure Environment Variables**
    Create `.env` files for each service (Init-service, Orchestrator, Runner) based on the provided `.env.example` files. Ensure you set your AWS credentials and Kubernetes config paths.

4.  **Deploy Infrastructure**
    Apply the ingress controller and shared resources to your cluster:
    ```bash
    kubectl apply -f good-code/k8s/ingress-controller.yaml
    ```

5.  **Start the Backend Services**
    Run the Init-service and Orchestrator-service locally or deploy them to the cluster:
    ```bash
    # Terminal 1: Orchestrator
    cd good-code/orchestrator-simple
    npm install && npm start

    # Terminal 2: Init Service
    cd good-code/init-service
    npm install && npm start
    ```

6.  **Start the Frontend**
    ```bash
    cd good-code/frontend
    npm install
    npm run dev
    ```

## 🛡️ Security Architecture

This project emphasizes security by moving away from monolithic execution. By using the **Orchestrator** to spin up isolated Kubernetes pods for every `replId`, we ensure that:
* User code runs in a sandboxed environment.
* Resource limits (CPU/RAM) can be enforced per user.
* Network policies can prevent users from accessing internal services.