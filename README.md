<!--
SPDX-FileCopyrightText: © 2025 Cornell Ziepel <research@cornell-ziepel.de>

SPDX-License-Identifier: CC-BY-SA-4.0
-->

# mopri
Mopri is a project designed for the privacy analysis of Android applications, developed from a collaboration between the Chair of Privacy and Security at TU Dresden and the Saxon Data Protection and Transparency Commissioner. 
It integrates a variety of analyses and tools into a streamlined pipeline, providing users with a web interface to control the process and investigate comprehensive analysis results. At the current stage, it offers static analysis utilizing Exodus and dynamic analysis utilizing several network traffic recording strategies. Mopri is built to be modular and expandable.

The dynamic analysis can be conducted on an Android emulator (automatically installed by the software) or a physical Android device (which needs to be rooted). All tools installed during a test are automatically removed after the test is completed.


## Getting Started

### Prequirements
- You need to have the following tools installed on your host system:
    - `node` && `npm`

### Install and Setup mopri
To get started with mopri, follow these steps:
1. **Install pnpm**: If you haven't already, install `pnpm` globally:

   ```bash
   npm install -g pnpm
   ```
2. **Clone the repository**:

   ```bash
   git clone https://github.com/dfd-tud/mopri
   cd mopri
   ```
3. **Install dependencies**:

   ```bash
   pnpm install 
   ```
   
   **Note**: This process may take some time, especially if it's your first time running it on your system. During the installation, essential tools and packages, including Android build tools, will be downloaded and configured. Please be patient as this ensures that all components are properly set up for the project.


4. **Build Schemas**
    ```bash
    pnpm --filter @mopri/schema build
    ```
5. **Start mopri**:
   - Start the backend

     ```bash
     pnpm --filter @mopri/backend dev 
     ```
   - Start the frontend

     ```
     pnpm --filter @mopri/frontend run dev                
     ```
6. **Start using mopri**:
    Open your browser and navigate to **[http://localhost:5173/](http://localhost:5173/)**. 

### Setup physical device

- in order to use tweasel (with mitmproxy): 
  - make sure that both phone and host pc are in the same network
  - allow incoming traffic on port `51820`

## Workspaces

### 1. @mopri/backend

The backend is a Node.js application built with Express. It exposes a RESTful API. You can find the Swagger documentation at `your-domain/api-docs`.

- [Backend Workspace](./backend)

### 2. @mopri/frontend

The frontend is a web application that interacts with the backend API, providing a user-friendly interface for users to interact with the services offered by the backend.

- [Frontend Workspace](./frontend)

### 3. @mopri/schema

The schema workspace defines the data models and types used across the backend and frontend, ensuring consistency and type safety throughout the application.

- [Schema Workspace](./packages/mopri-schema)
