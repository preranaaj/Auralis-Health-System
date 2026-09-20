# Auralis Health Systems

A state-of-the-art Clinical Decision Support System (CDSS) and Hospital Management Platform designed for the modern healthcare era. Auralis combines high-fidelity data visualization with an immersive, glassmorphic user interface to provide clinicians with real-time insights and a streamlined workflow.



## 🌟 Key Features

- **Real-time Clinical Telemetry**: High-frequency monitoring of heart rate, blood pressure, SpO2, and temperature with interactive clinical charts.
- **Intelligent Patient Census**: Dynamic dashboard for physicians to manage patient loads, track vital trends, and monitor clinical status.
- **Role-Based Access Control**: Secure, dedicated interfaces for Administrators, Physicians (Doctors), and Patients.
- **Appointment Management**: Comprehensive scheduling system for clinical sessions with status tracking and notes.
- **Analytics & KPIs**: Visual data insights including patient admission trends, department performance, and clinical success rates.
- **Premium Aesthetics**: Fully responsive, glassmorphic design system tailored for high-stakes medical environments.

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 19 (Vite)
- **Styling**: Tailwind CSS (Custom Clinical Theme)
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Charts**: Recharts
- **Routing**: React Router 7

### Backend
- **Framework**: FastAPI (Python 3.13)
- **Database**: MongoDB Atlas (Cloud)
- **Asynchronous Driver**: Motor
- **Security**: Passlib (Bcrypt, SHA256, PBKDF2)
- **Server**: Uvicorn

---

## 📁 Project Structure

- **`auralis-frontend/`**: The React & Vite web application providing the sleek user interface.
- **`auralis-backend/`**: The FastAPI backend powering the APIs, predictive ML models, and clinical algorithms.
- **`Patient Vital Signs and Event Tracking/`**: Contains the `dummy_obs.csv` dataset and vital sign tracking information used for testing and ML model configuration.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v20.19+ or v22.12+)
- Python 3.10+
- MongoDB Atlas Cluster (or local MongoDB)

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd auralis-backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: .\venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file from the template:
   ```bash
   cp .env.example .env
   ```
5. Open `.env` and paste **your own MongoDB Connection String** in the `MONGO_URI` field.
6. Seed your local database with initial data:
   ```bash
   python seed_for_team.py
   ```
7. Run the development server:
   ```bash
   python main.py
   ```
   *The backend will run on `http://127.0.0.1:8000`*

### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd auralis-frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   *The frontend will run on `http://localhost:5173`*

### 3. Connectivity Note
The frontend is configured with a **Vite Network Proxy**. All requests to `/api` are automatically forwarded to the backend on port 8000. This ensures zero CORS issues and a stable connection protocol.

---

---

## 🔐 Default Credentials (Sample)

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@auralis.com` | `admin123` |
| **Doctor** | `doctor@auralis.com` | `password123` |

---

## 📄 License
© 2026 ATOS-project-2. Developed for Auralis Health Systems.
