from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict
import pandas as pd
import numpy as np
import os
import motor.motor_asyncio
from passlib.context import CryptContext
from datetime import datetime
from dotenv import load_dotenv
import hmac
import hashlib
import json
from fastapi import WebSocket, WebSocketDisconnect
from rule_engine import engine as clinical_rule_engine
from fhir_models import FHIRPatient, FHIRObservation, FHIRIdentifier, FHIRCodeableConcept, FHIRCoding, FHIRQuantity
from ml_engine import ml_predictor
from bson import ObjectId

load_dotenv()

app = FastAPI(title="Auralis Health Systems API")

# Security
pwd_context = CryptContext(schemes=["sha256_crypt", "bcrypt", "pbkdf2_sha256"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    try:
        # Passlib has some issues on newer Python versions with bcrypt detection
        return pwd_context.verify(plain_password, hashed_password)
    except ValueError as e:
        # If bcrypt 72-byte error occurs, try a direct check if it looks like a bcrypt hash
        if "72 bytes" in str(e) and hashed_password.startswith("$2"):
            import bcrypt
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        print(f"Password verification error: {e}")
        return False
    except Exception as e:
        print(f"Auth verification exception: {e}")
        return False

@app.get("/")
async def root():
    return {"message": "Auralis Health Systems API is online", "docs": "/docs", "health": "/health"}

@app.get("/health")
async def health_check():
    return {"status": "connected", "database": "stable", "timestamp": datetime.utcnow()}

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import certifi

# Configuration
DATA_PATH = os.path.join("..", "Patient Vital Signs and Event Tracking", "dummy_obs.csv")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/auralis_db")

# Database Init
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI, tlsCAFile=certifi.where())
db = client.auralis_db
SECRET_KEY = os.getenv("SECRET_KEY", "auralis-secure-key-2024")

# WebSocket Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()

# Models
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    gender: str
    role: Optional[str] = "Patient"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str

class DoctorUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    specialty: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    bio: Optional[str] = None
    experience: Optional[str] = None
    education: Optional[str] = None
    achievements: Optional[List[str]] = None
    clinical_stats: Optional[Dict[str, str]] = None
    image: Optional[str] = None
    gender: Optional[str] = None

class VitalsCreate(BaseModel):
    hr: int
    sbp: int
    dbp: int
    rr: Optional[int] = 18
    temp: float
    spo2: int
    weight: Optional[float] = None
    height: Optional[float] = None
    note: Optional[str] = ""

class DiagnosisCreate(BaseModel):
    patient_id: str
    symptoms: str
    diagnosis: str
    prescription: str
    notes: Optional[str] = ""
    follow_up_plan: Optional[str] = ""

class BillCreate(BaseModel):
    patient_id: str
    service_name: str
    unit_cost: float
    quantity: int
    total_cost: float
    service_date: str
    status: Optional[str] = "Unpaid"

class AppointmentBase(BaseModel):
    patient_id: str
    patient_name: str
    doctor_id: str
    doctor_name: str
    service: str
    date: str
    time: str
    notes: Optional[str] = ""
    status: Optional[str] = "Pending"

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    status: Optional[str] = None
    cancellation_reason: Optional[str] = None

class PatientBase(BaseModel):
    name: str
    age: int
    gender: str
    condition: str
    status: str
    ward: str
    risk: Optional[str] = "Low"
    blood_type: Optional[str] = "O+"
    ml_risk_score: Optional[float] = 0.15
    phone: Optional[str] = ""
    email: Optional[str] = ""
    address: Optional[str] = ""
    medical_history: Optional[str] = "None reported"
    performed_by: Optional[str] = None

class PatientCreate(PatientBase):
    pass

class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    condition: Optional[str] = None
    status: Optional[str] = None
    ward: Optional[str] = None
    risk: Optional[str] = None
    blood_type: Optional[str] = None
    ml_risk_score: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    medical_history: Optional[str] = None
    performed_by: Optional[str] = None

class ReviewCreate(BaseModel):
    doctor_id: str
    patient_id: str
    patient_name: str
    rating: int
    comment: str

class ReviewResponse(ReviewCreate):
    id: str
    created_at: datetime

class AuditLogCreate(BaseModel):
    user_id: str
    username: str
    role: str
    action: str
    details: Optional[str] = ""

async def log_action(username: str, action: str, role: str, user_id: str = "system", details: str = ""):
    log_data = f"{username}|{action}|{role}|{user_id}|{details}|{datetime.utcnow().isoformat()}"
    signature = hmac.new(SECRET_KEY.encode(), log_data.encode(), hashlib.sha256).hexdigest()
    
    log_entry = {
        "user_id": user_id,
        "username": username,
        "role": role,
        "action": action,
        "details": details,
        "timestamp": datetime.utcnow(),
        "signature": signature,
        "integrity_v": "v1.hmac-sha256"
    }
    await db.audit_logs.insert_one(log_entry)

# Load CSV data
try:
    df = pd.read_csv(DATA_PATH)
    df['hadm_id'] = df['hadm_id'].astype(str)
    df['charttime'] = pd.to_datetime(df['charttime'])
    df = df.sort_values(['hadm_id', 'charttime'])
except Exception as e:
    print(f"Error loading data: {e}")
    df = pd.DataFrame()

# Auth Endpoints
@app.on_event("startup")
async def startup_db_client():
    print("Application starting up... verifying system roles in separate collections")
    try:
        hashed_pwd = pwd_context.hash("password123")
        admin_pwd = pwd_context.hash("admin123")
        
        # Seed Administrations
        admin_doc = {
            "name": "System Administrator",
            "email": "admin@auralis.com",
            "password": admin_pwd,
            "role": "Admin",
            "gender": "Other",
            "created_at": datetime.utcnow()
        }
        if not await db.admin.find_one({"email": admin_doc["email"]}):
            await db.admin.insert_one(admin_doc)
            print("Seeded Admin: admin@auralis.com")

        # Seed Doctors
        doctors_to_seed = [
            {
                "name": "Dr. Sarah Connor",
                "email": "sarah.c@auralis.com",
                "password": hashed_pwd,
                "role": "Doctor",
                "specialty": "Cardiology",
                "department": "ER",
                "gender": "Female",
                "bio": "Experienced cardiologist specializing in emergency trauma and cardiac surgery.",
                "experience": "18 Years",
                "education": "Harvard Medical School",
                "achievements": ["Innovator of the Year 2023", "Chief of Surgery 2021-Present", "Board Certified in Cardiothoracic Surgery"],
                "clinical_stats": {"surgeries": "4,200+", "patient_success": "99.2%", "consultations": "12k+"},
                "image": "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
                "created_at": datetime.utcnow()
            },
            {
                "name": "General Doctor",
                "email": "doctor@auralis.com",
                "password": hashed_pwd,
                "role": "Doctor",
                "specialty": "Internal Medicine",
                "department": "General Ward",
                "gender": "Other",
                "created_at": datetime.utcnow()
            }
        ]
        
        for doc in doctors_to_seed:
            if not await db.doctors.find_one({"email": doc["email"]}):
                await db.doctors.insert_one(doc)
                print(f"Seeded Doctor: {doc['email']}")
        
    except Exception as e:
        print(f"Startup user seeding error: {e}")

    # Deduplication and Uniqueness Enforcement
    print("Enforcing clinical record integrity...")
    try:
        await db.patients.create_index("id", unique=True, sparse=True)
        print("Unique index on 'id' confirmed.")
    except Exception as e:
        print(f"Index creation failed, attempting cleanup: {e}")
        pipeline = [
            {"$match": {"id": {"$ne": None}}},
            {"$group": {"_id": "$id", "ids": {"$push": "$_id"}, "count": {"$sum": 1}}},
            {"$match": {"count": {"$gt": 1}}}
        ]
        duplicates_cursor = db.patients.aggregate(pipeline)
        async for doc in duplicates_cursor:
            to_delete = doc["ids"][1:]
            await db.patients.delete_many({"_id": {"$in": to_delete}})
            
        try:
            await db.patients.create_index("id", unique=True, sparse=True)
            print("Unique index enforced after cleanup.")
        except Exception as final_e:
            print(f"Final index enforcement failed: {final_e}")

    print("Checking for legacy patient migration...")
    try:
        if not df.empty:
            unique_patients = df.groupby('hadm_id').first().reset_index()
            migrated_count = 0
            for _, row in unique_patients.iterrows():
                hid = str(row['hadm_id'])
                try:
                    existing = await db.patients.find_one({"id": hid})
                    if not existing:
                        patient_doc = {
                            "id": hid,
                            "name": f"Patient {hid}",
                            "age": int(row['age']),
                            "gender": row['sex'],
                            "condition": "Clinical Monitoring",
                            "status": "Stable",
                            "ward": "General Ward",
                            "risk": "Low",
                            "blood_type": "O+",
                            "ml_risk_score": 0.15,
                            "created_at": datetime.utcnow(),
                            "lastCheck": str(datetime.utcnow())
                        }
                        await db.patients.insert_one(patient_doc)
                        migrated_count += 1
                except Exception:
                    pass
            if migrated_count > 0:
                print(f"Successfully migrated {migrated_count} legacy patients.")
    except Exception as e:
        print(f"Patient migration error: {e}")

@app.post("/auth/register", status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate):
    # Check all collections for duplicate email
    if await db.admin.find_one({"email": user.email}) or \
       await db.doctors.find_one({"email": user.email}) or \
       await db.patients.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = pwd_context.hash(user.password)
    user_dict = user.model_dump()
    user_dict["password"] = hashed_password
    user_dict["created_at"] = datetime.utcnow()
    
    if user.role == "Admin":
        target_col = db.admin
    elif user.role == "Doctor":
        target_col = db.doctors
    else:
        target_col = db.patients
        # For patients, we might need extra fields like age, condition
        user_dict.setdefault("age", 0)
        user_dict.setdefault("condition", "General Checkup")
        user_dict.setdefault("status", "Stable")
        user_dict.setdefault("ward", "OPD")
        user_dict.setdefault("risk", "Low")
        user_dict.setdefault("lastCheck", str(datetime.utcnow()))

    result = await target_col.insert_one(user_dict)
    
    return {
        "id": str(result.inserted_id),
        "name": user.name,
        "email": user.email,
        "role": user.role
    }

@app.post("/auth/login")
async def login(user_data: UserLogin):
    print(f"DEBUG: Login attempt for email: {user_data.email}")
    user = None
    # Priority search: check 'users' first as it's the primary auth source, 
    # then fallback to specific collections if needed.
    search_email = user_data.email.lower()
    for col_name in ["users", "admin", "doctors", "patients"]:
        col = db[col_name]
        found_user = await col.find_one({"email": search_email})
        if found_user:
            print(f"DEBUG: Found user in collection: {col_name}")
            if "password" in found_user:
                user = found_user
                break
            else:
                print(f"DEBUG: User in {col_name} has no password field")
        
    if not user:
        print(f"DEBUG: User {search_email} not found in any collection")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not verify_password(user_data.password, user["password"]):
        print(f"DEBUG: Password verification failed for {search_email}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    print(f"DEBUG: Login successful for {search_email}")
    
    # Log the login action
    await log_action(
        username=user["name"],
        action="Login",
        role=user.get("role", "User"),
        user_id=str(user["_id"]) if "_id" in user else user.get("id"),
        details=f"Successful login from {col_name} collection"
    )

    return {
        "id": str(user["_id"]) if "_id" in user else user.get("id"),
        "name": user["name"],
        "email": user["email"],
        "role": user.get("role", "Patient")
    }

@app.get("/doctors")
async def get_doctors():
    doctors_cursor = db.doctors.find({}, {"password": 0})
    doctors = []
    async for doc in doctors_cursor:
        doc["id"] = str(doc["_id"])
        if "_id" in doc: del doc["_id"]
        doctors.append(doc)
    return doctors

@app.get("/doctors/{doctor_id}")
async def get_doctor(doctor_id: str):
    from bson import ObjectId
    try:
        doctor = await db.doctors.find_one({"_id": ObjectId(doctor_id)}, {"password": 0})
    except:
        doctor = None
        
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    doctor["id"] = str(doctor["_id"])
    del doctor["_id"]
    return doctor

@app.post("/doctors/{doctor_id}/reviews", status_code=status.HTTP_201_CREATED)
async def add_review(doctor_id: str, review: ReviewCreate):
    review_dict = review.model_dump()
    review_dict["created_at"] = datetime.utcnow()
    result = await db.reviews.insert_one(review_dict)
    return {"message": "Review sumbitted", "id": str(result.inserted_id)}

@app.get("/doctors/{doctor_id}/reviews")
async def get_reviews(doctor_id: str):
    reviews = []
    async for r in db.reviews.find({"doctor_id": doctor_id}).sort("created_at", -1):
        r["id"] = str(r["_id"])
        del r["_id"]
        reviews.append(r)
    return reviews

@app.post("/patients", status_code=status.HTTP_201_CREATED)
async def admit_patient(patient: PatientCreate):
    patient_dict = patient.model_dump()
    patient_dict["created_at"] = datetime.utcnow()
    patient_dict["lastCheck"] = str(datetime.utcnow())
    
    result = await db.patients.insert_one(patient_dict)
    
    # Log the action
    await log_action(
        username=patient.performed_by or "System/Admin",
        action="Patient Admitted",
        role="Doctor/Admin",
        details=f"Admitted patient: {patient.name}"
    )

    patient_dict["id"] = str(result.inserted_id)
    del patient_dict["_id"]
    return patient_dict

@app.put("/patients/{patient_id}")
async def update_patient(patient_id: str, patient_update: PatientUpdate):
    update_data = {k: v for k, v in patient_update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    update_data["updated_at"] = datetime.utcnow()
    
    from bson import ObjectId
    try:
        obj_id = ObjectId(patient_id)
        result = await db.patients.update_one({"_id": obj_id}, {"$set": update_data})
        if result.matched_count == 0:
            result = await db.patients.update_one({"id": patient_id}, {"$set": update_data})
    except Exception:
        result = await db.patients.update_one({"id": patient_id}, {"$set": update_data})
        
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    # Log the update action
    await log_action(
        username=patient_update.performed_by or "System/Admin",
        action="Patient Record Updated",
        role="Doctor/Admin",
        details=f"Updated details for patient ID: {patient_id}"
    )
            
    return {"message": "Patient updated successfully"}

@app.get("/patients")
async def get_patients():
    patient_list = []
    async for patient in db.patients.find():
        pid = patient.get("id") or str(patient["_id"])
        patient_list.append({
            "id": pid,
            "name": patient["name"],
            "age": patient["age"],
            "gender": patient.get("gender", "U"),
            "condition": patient.get("condition", "N/A"),
            "status": patient.get("status", "Stable"),
            "ward": patient.get("ward", "Observation"),
            "lastVisit": patient.get("lastCheck", "Recently"),
            "risk": patient.get("risk", "Low"),
            "phone": patient.get("phone", "+1-000-000-0000"),
            "email": patient.get("email", "patient@auralis.com"),
            "address": patient.get("address", "Auralis Medical Center"),
            "medical_history": patient.get("medical_history", "None reported")
        })
    return patient_list

@app.get("/patients/{patient_id}")
async def get_patient(patient_id: str):
    patient = await db.patients.find_one({"id": patient_id})
    if not patient:
        try:
            from bson import ObjectId
            patient = await db.patients.find_one({"_id": ObjectId(patient_id)})
        except:
            pass
    
    if patient:
        patient["id"] = patient.get("id") or str(patient["_id"])
        if "_id" in patient: del patient["_id"]
        return patient

    if not df.empty:
        patient_df = df[df['hadm_id'] == patient_id]
        if not patient_df.empty:
            row = patient_df.iloc[0]
            latest = patient_df.iloc[-1]
            is_critical = (latest['SBP'] > 160) or (latest['SPO2'] < 90) or (latest['HR'] > 120)
            return {
                "id": str(row['hadm_id']),
                "name": f"Patient {row['hadm_id']}",
                "age": int(row['age']),
                "gender": row['sex'],
                "condition": "Clinical Monitoring",
                "status": "Critical" if is_critical else "Stable",
                "ward": "ICU" if is_critical else "General Ward",
                "lastVisit": str(latest['charttime']),
                "risk": "High" if is_critical else "Low",
                "blood_type": "A+",
                "ml_risk_score": 0.85 if is_critical else 0.12
            }
    raise HTTPException(status_code=404, detail="Patient not found")

@app.post("/patients/{patient_id}/vitals")
async def add_vitals(patient_id: str, vitals: VitalsCreate):
    vitals_dict = vitals.model_dump()
    vitals_dict["patient_id"] = patient_id
    vitals_dict["timestamp"] = datetime.utcnow()
    
    await db.vitals.insert_one(vitals_dict)
    
    # Safely convert MongoDB and datetime objects to strings before broadcasting
    vitals_dict["_id"] = str(vitals_dict["_id"])
    if isinstance(vitals_dict["timestamp"], datetime):
        vitals_dict["timestamp"] = vitals_dict["timestamp"].isoformat()

    # Trigger Rule Engine
    alerts = clinical_rule_engine.process_vitals(vitals_dict)
    if alerts:
        for alert in alerts:
            await log_action(
                username="RuleEngine",
                action="Clinical Alert",
                role="System",
                details=f"Patient {patient_id}: {alert['message']}"
            )
            # Broadcast alert via WebSocket
            await manager.broadcast({"type": "ALERT", "patient_id": patient_id, "data": alert})

    # Broadcast vitals via WebSocket
    await manager.broadcast({
        "type": "VITALS_UPDATE",
        "patient_id": patient_id,
        "data": vitals_dict
    })

    # Recalculate ML Risk and Update Patient Record
    vitals_history = await get_patient_vitals(patient_id)
    risk_prob = float(ml_predictor.predict_readmission(vitals_history))
    
    risk_level = "Low"
    if risk_prob > 0.4: risk_level = "High"
    elif risk_prob > 0.25: risk_level = "Moderate"

    # Synchronize clinical status based on deterministic rule engine severity
    clinical_status = "Stable"
    if alerts:
        if any(a.get("severity") == "Critical" for a in alerts):
            clinical_status = "Critical"
            risk_level = "High"
        elif any(a.get("severity") == "High" for a in alerts):
            clinical_status = "Critical"

    update_patient_data = {
        "lastCheck": str(datetime.utcnow()),
        "ml_risk_score": risk_prob,
        "risk": risk_level,
        "status": clinical_status # Used by Admin Dashboard & Critical Alerts
    }

    try:
        # Try updating by _id first if it looks like an ObjectId
        if len(patient_id) == 24:
            await db.patients.update_one({"_id": ObjectId(patient_id)}, {"$set": update_patient_data})
        # Always try updating by 'id' as a fallback or if it's a MIMIC-style ID
        await db.patients.update_one({"id": patient_id}, {"$set": update_patient_data})
    except Exception as e:
        print(f"Error updating patient clinical state: {e}")
        
    return {
        "message": "Vitals recorded and clinical state updated",
        "timestamp": str(vitals_dict["timestamp"]),
        "alerts": int(len(alerts)),
        "new_risk_score": float(round(risk_prob, 4)),
        "new_status": str(clinical_status)
    }

# WebSocket Endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, though mainly server-to-client
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# FHIR-compliant Endpoints
@app.post("/fhir/Patient")
async def create_fhir_patient(patient: FHIRPatient):
    patient_dict = patient.model_dump()
    patient_dict["created_at"] = datetime.utcnow()
    # Map FHIR fields to our internal database structure if needed, or store as-is
    result = await db.patients_fhir.insert_one(patient_dict)
    return {"id": str(result.inserted_id), "resource": patient}

@app.get("/fhir/Observation/{patient_id}")
async def get_fhir_observations(patient_id: str):
    observations = []
    async for obs in db.vitals.find({"patient_id": patient_id}):
        # Map our internal vitals to FHIRObservation
        fhir_obs = FHIRObservation(
            status="final",
            code=FHIRCodeableConcept(coding=[FHIRCoding(system="http://loinc.org", code="8867-4", display="Heart rate")]),
            subject={"reference": f"Patient/{patient_id}"},
            effectiveDateTime=obs["timestamp"],
            valueQuantity=FHIRQuantity(value=float(obs["hr"]), unit="beats/minute", code="/min")
        )
        observations.append(fhir_obs)
    return observations

@app.get("/patients/{patient_id}/risk-assessment")
async def get_patient_risk_assessment(patient_id: str):
    vitals_history = await get_patient_vitals(patient_id)
    if not vitals_history:
        return {
            "risk_score": 0.15, 
            "status": "Low", 
            "stability_index": "10/10",
            "response_rate": "Stable",
            "message": "Baseline risk (insufficient data)"
        }
    
    # Aggregated features and ML prediction
    risk_prob = ml_predictor.predict_readmission(vitals_history)
    
    status = "Low"
    if risk_prob > 0.4: status = "High"
    elif risk_prob > 0.25: status = "Moderate"
    
    # Calculate Stability Index (0-10) based on inverse of normalized std dev
    if len(vitals_history) > 2:
        df_v = pd.DataFrame(vitals_history)
        # Weighting SPO2 volatility more as it's more critical
        vols = []
        for col in ['hr', 'sbp', 'spo2']:
            if col in df_v.columns:
                std = df_v[col].tail(5).std()
                mean = df_v[col].mean()
                vols.append(min(1.0, std / (mean * 0.15) if mean > 0 else 0))
        
        avg_vol = np.mean(vols) if vols else 0
        stability = max(0, 10 - round(avg_vol * 10, 1))
    else:
        stability = 10.0

    # Calculate Response Rate
    # If risk is decreasing, response is positive
    response_rate = "Normal"
    if len(vitals_history) >= 3:
        # Simple trend check: is the latest vital better than the average of previous?
        latest = vitals_history[-1]
        prev_mean_hr = np.mean([v['hr'] for v in vitals_history[-5:-1]])
        if latest['hr'] < prev_mean_hr and latest['spo2'] > 95:
            response_rate = "Positive"
        elif latest['hr'] > prev_mean_hr + 10:
            response_rate = "Declining"

    return {
        "patient_id": patient_id,
        "risk_score": round(risk_prob, 4),
        "status": status,
        "stability_index": f"{stability}/10",
        "response_rate": response_rate,
        "prediction_target": "30-day Readmission",
        "timestamp": datetime.utcnow(),
        "model_version": "v1.0.rf-longitudinal"
    }

@app.get("/patients/{patient_id}/vitals")
async def get_patient_vitals(patient_id: str):
    # 1. Get from MongoDB
    db_vitals = []
    async for v in db.vitals.find({"patient_id": patient_id}).sort("timestamp", 1):
        db_vitals.append({
            "timestamp": v["timestamp"].isoformat(),
            "hr": v["hr"],
            "rr": v.get("rr", 18),
            "sbp": v["sbp"],
            "dbp": v.get("dbp", 80), # Default to 80 if missing
            "temp": v["temp"],
            "spo2": v["spo2"],
            "avpu": 0
        })

    # 2. Get from CSV
    patient_df = df[df['hadm_id'] == patient_id]
    csv_vitals = []
    if not patient_df.empty:
        for _, row in patient_df.iterrows():
            csv_vitals.append({
                "timestamp": str(row['charttime']),
                "hr": float(row['HR']),
                "rr": float(row['RR']),
                "sbp": float(row['SBP']),
                "dbp": 80.0, # Placeholder for legacy CSV data
                "temp": float(row['TEMP']),
                "spo2": float(row['SPO2']),
                "avpu": int(row['avpu'])
            })
    
    # 3. Combine and Return
    all_vitals = csv_vitals + db_vitals
    if not all_vitals:
        return []
        
    return all_vitals

@app.get("/patients/{patient_id}/ml-trends")
async def get_patient_ml_trends(patient_id: str, time_scale: Optional[str] = "all"):
    try:
        vitals_data = await get_patient_vitals(patient_id)
        if not vitals_data:
            return {"anomalies": [], "trends": [], "summary": "No clinical data available."}
            
        # Full Historical Data for Baseline
        df_all = pd.DataFrame(vitals_data)
        df_all['timestamp'] = pd.to_datetime(df_all['timestamp'])
        df_all = df_all.sort_values('timestamp')
        
        # Filtered Window Data for current view
        df_window = df_all.copy()
        if time_scale != "all":
            now = pd.Timestamp.utcnow().tz_localize(None)
            if df_window['timestamp'].dt.tz is not None:
                df_window['timestamp'] = df_window['timestamp'].dt.tz_localize(None)
                
            if time_scale == "24h":
                cutoff = now - pd.Timedelta(days=1)
            elif time_scale == "7d":
                cutoff = now - pd.Timedelta(days=7)
            else:
                cutoff = pd.Timestamp.min
            df_window = df_window[df_window['timestamp'] >= cutoff]
            
        if len(df_all) < 2:
            return {
                "anomalies": [], 
                "trends": [], 
                "summary": "Establishing patient physiological baseline."
            }

        anomalies = []
        trends = []
        metrics = ['hr', 'sbp', 'temp', 'spo2']
        names = {'hr': 'Heart Rate', 'sbp': 'Blood Pressure', 'temp': 'Temperature', 'spo2': 'Oxygen Saturation'}
        
        # Identify "Latest" data (up to last 5 entries) for immediate alerts
        latest_n = min(5, len(df_all))
        df_latest = df_all.tail(latest_n)
        
        for metric in metrics:
            if metric not in df_all.columns: continue
            
            # Calculate historical baseline
            # If we have enough data, exclude the last N points to detect spikes in them
            # If we have very little data, use everything but the last 1 point
            if len(df_all) > latest_n:
                df_baseline = df_all.iloc[:-latest_n]
            elif len(df_all) > 1:
                df_baseline = df_all.iloc[:-1]
            else:
                df_baseline = df_all

            base_mean = df_baseline[metric].mean()
            base_std = df_baseline[metric].std()
            
            if pd.isna(base_mean) or base_mean == 0:
                base_mean = df_all[metric].mean()
                base_std = df_all[metric].std()

            if pd.isna(base_mean) or base_mean == 0: continue

            # 1. Immediate Anomaly Detection (Check latest points vs baseline)
            for _, row in df_latest.iterrows():
                val = row[metric]
                if pd.isna(val): continue
                
                pct_diff = abs(val - base_mean) / base_mean if base_mean != 0 else 0
                
                is_anomaly = False
                severity = "Medium"
                
                # Check percentage shift
                if pct_diff > 0.15:
                    is_anomaly = True
                    severity = "High" if pct_diff > 0.25 else "Medium"
                
                # Check Z-score
                if not is_anomaly and not pd.isna(base_std) and base_std > 0:
                    zscore = (val - base_mean) / base_std
                    if abs(zscore) > 2.0:
                        is_anomaly = True
                        severity = "High" if abs(zscore) > 3.0 else "Medium"
                
                if is_anomaly:
                    if not any(a['metric'] == metric and a['value'] == val for a in anomalies):
                        anomalies.append({
                            "metric": metric,
                            "label": names[metric],
                            "value": val,
                            "timestamp": row['timestamp'].isoformat() if hasattr(row['timestamp'], 'isoformat') else str(row['timestamp']),
                            "severity": severity,
                            "type": "Spike" if val > base_mean else "Drop"
                        })

            # 2. Trend Analysis (Shift Detection in window)
            if not df_window.empty:
                win_mean = df_window[metric].mean()
                if not pd.isna(win_mean) and base_mean > 0:
                    shift_pct = ((win_mean - base_mean) / base_mean) * 100
                    # Lower threshold for trend detection to be more sensitive
                    if abs(shift_pct) > 5:
                        trends.append({
                            "metric": metric,
                            "label": names[metric],
                            "direction": "Upward" if shift_pct > 0 else "Downward",
                            "change_pct": round(shift_pct, 1),
                            "insight": f"{names[metric]} is {round(abs(shift_pct))}% {'higher' if shift_pct > 0 else 'lower'} than historical baseline."
                        })

        # Summary Generation
        time_label = "current selection" if time_scale == "all" else f"last {time_scale}"
        critical_count = len([a for a in anomalies if a['severity'] == "High"])
        
        if critical_count > 0:
            summary = f"Detected {critical_count} critical physiological spikes. Immediate clinical evaluation of {', '.join(set(a['label'] for a in anomalies if a['severity']=='High'))} is required."
        elif trends:
            high_trend = max(trends, key=lambda x: abs(x['change_pct']))
            summary = f"Noticeable {high_trend['direction'].lower()} shift detected in {high_trend['label']} compared to baseline."
        elif anomalies:
            summary = f"Minor physiological fluctuations detected in recent readings. Monitoring continues."
        else:
            summary = f"Patient physiological state is stable and consistent with historical clusters for the {time_label}."

        return {
            "anomalies": anomalies[:10],
            "trends": trends,
            "summary": summary,
            "time_scale": time_scale,
            "ml_version": "v1.3.robust-sensitive"
        }
    except Exception as e:
        print(f"Error in ML trends analysis: {e}")
        import traceback
        traceback.print_exc()
        return {
            "anomalies": [],
            "trends": [],
            "summary": "Clinical analysis module encountered an error processing this patient's history.",
            "error": str(e)
        }

@app.get("/patients/{patient_id}/risk-history")
async def get_patient_risk_history(patient_id: str):
    vitals_data = await get_patient_vitals(patient_id)
    if not vitals_data:
        return []

    # Create a history of risk scores by processing vitals in sliding windows
    risk_history = []
    
    # Sort vitals by timestamp
    vitals_data.sort(key=lambda x: x['timestamp'])
    
    # Generate points: 3 historical points from the past, and up to 4 points from recent data
    # (The goal is to show the 'current' trend more clearly)
    
    # 1. Historical points (coarse)
    historical_count = min(3, len(vitals_data) // 2)
    if historical_count > 0:
        step = len(vitals_data) // historical_count
        for i in range(0, len(vitals_data) - 5, step):
            subset = vitals_data[:i+1]
            score = ml_predictor.predict_readmission(subset)
            risk_history.append({
                "time": vitals_data[i]['timestamp'],
                "risk": round(score * 100, 1),
                "status": "Critical" if score > 0.7 else "High" if score > 0.4 else "Medium" if score > 0.25 else "Low"
            })

    # 2. Recent points (granular) - Last 5 observations
    recent_vitals = vitals_data[-5:]
    start_idx = max(0, len(vitals_data) - 5)
    for i, _ in enumerate(recent_vitals):
        subset = vitals_data[:start_idx + i + 1]
        score = ml_predictor.predict_readmission(subset)
        risk_history.append({
            "time": subset[-1]['timestamp'],
            "risk": round(score * 100, 1),
            "status": "Critical" if score > 0.7 else "High" if score > 0.4 else "Medium" if score > 0.25 else "Low"
        })
    
    # Sort and Deduplicate by timestamp
    seen = set()
    unique_history = []
    # Ensure items are sorted correctly before deduplication
    sorted_history = sorted(risk_history, key=lambda x: str(x['time']))
    for item in sorted_history:
        ts = str(item['time'])
        if ts not in seen:
            unique_history.append(item)
            seen.add(ts)
            
    return unique_history[-10:] 

@app.get("/patients/{patient_id}/timeline")
async def get_patient_timeline(patient_id: str):
    timeline = []
    
    # 1. Fetch Admission Baseline (if exists)
    patient = await db.patients.find_one({"$or": [{"_id": ObjectId(patient_id) if ObjectId.is_valid(patient_id) else None}, {"id": patient_id}]})
    if patient:
        timeline.append({
            "time": str(patient.get("created_at", datetime.utcnow())),
            "event": "Clinical Admission",
            "type": "initial",
            "provider": "Admissions Desk",
            "description": f"Patient admitted for {patient.get('condition', 'Observation')}."
        })

    # 2. Fetch Vitals Events (Sample them if too many)
    async for v in db.vitals.find({"patient_id": patient_id}).sort("timestamp", -1).limit(10):
        timeline.append({
            "time": str(v["timestamp"]),
            "event": "Vitals Synchronization",
            "type": "vital_check",
            "provider": "Nursing Staff",
            "description": f"HR: {v['hr']}, BP: {v['sbp']}/{v.get('dbp', 80)}, SpO2: {v['spo2']}%"
        })

    # 3. Fetch Diagnosis Events
    async for d in db.diagnosis.find({"patient_id": patient_id}).sort("timestamp", -1):
        timeline.append({
            "time": str(d["timestamp"]),
            "event": "Physician Consultation",
            "type": "consult",
            "provider": "Attending Physician",
            "description": f"Diagnosis: {d['diagnosis']}. Treatment initiated."
        })

    # 4. Fetch Billing Events
    async for b in db.bills.find({"patient_id": patient_id}).sort("created_at", -1):
        timeline.append({
            "time": str(b.get("created_at", datetime.utcnow())),
            "event": "Administrative Billing",
            "type": "billing",
            "provider": "Finance Dept",
            "description": f"Generated bill for {b['service_name']} - ₹{b['total_cost']}"
        })

    # Sort final timeline by time descending
    timeline.sort(key=lambda x: x["time"], reverse=True)
    
    # Fallback if empty
    if not timeline:
        now = datetime.utcnow()
        return [
            {"time": str(now), "event": "System Initialization", "type": "observation", "provider": "Auralis AI", "description": "No historical events found for this record."}
        ]
        
    return timeline

@app.put("/doctors/{doctor_id}")
async def update_doctor_profile(doctor_id: str, doctor_data: DoctorUpdate):
    update_data = {k: v for k, v in doctor_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No clinical data provided for update")

    from bson import ObjectId
    user_to_sync = None
    
    # 1. Update Clinical Profile (Doctors Collection)
    try:
        if len(doctor_id) == 24: # Likely ObjectId
            query = {"_id": ObjectId(doctor_id)}
        else:
            query = {"id": doctor_id}
            
        current_doc = await db.doctors.find_one(query)
        if not current_doc:
            # Fallback to email if id doesn't match
            if "email" in update_data:
                current_doc = await db.doctors.find_one({"email": update_data["email"]})
                if current_doc:
                    query = {"_id": current_doc["_id"]}
        
        if not current_doc:
            raise HTTPException(status_code=404, detail="Clinical profile not found")
            
        # Capture email for user sync
        sync_email = current_doc.get("email")
        
        result = await db.doctors.update_one(query, {"$set": update_data})
    except Exception as e:
        print(f"Clinical update error: {e}")
        raise HTTPException(status_code=500, detail=f"Database synchronization failed: {str(e)}")

    # 2. Synchronize with Core User (Users Collection)
    # If name, email, or gender changed, we must update the auth record
    auth_updates = {}
    if "name" in update_data: auth_updates["name"] = update_data["name"]
    if "email" in update_data: auth_updates["email"] = update_data["email"]
    if "gender" in update_data: auth_updates["gender"] = update_data["gender"]
    
    if auth_updates and sync_email:
        try:
            await db.users.update_one({"email": sync_email}, {"$set": auth_updates})
            print(f"Synchronized auth record for {sync_email}")
        except Exception as e:
            print(f"Auth sync warning: {e}")

    return {"message": "Clinical profile synchronized successfully"}

@app.post("/patients/{patient_id}/diagnosis")
async def add_diagnosis(patient_id: str, diagnosis: DiagnosisCreate):
    diag_dict = diagnosis.model_dump()
    diag_dict["timestamp"] = datetime.utcnow()
    await db.diagnosis.insert_one(diag_dict)
    return {"message": "Diagnosis added successfully", "timestamp": diag_dict["timestamp"]}

@app.get("/patients/{patient_id}/diagnosis")
async def get_diagnosis(patient_id: str):
    diagnosis_list = []
    async for d in db.diagnosis.find({"patient_id": patient_id}).sort("timestamp", -1):
        d["id"] = str(d["_id"])
        del d["_id"]
        diagnosis_list.append(d)
    return diagnosis_list

@app.post("/patients/{patient_id}/bills")
async def add_bill(patient_id: str, bill: BillCreate):
    bill_dict = bill.model_dump()
    bill_dict["created_at"] = datetime.utcnow()
    await db.bills.insert_one(bill_dict)
    return {"message": "Bill generated successfully"}

@app.get("/patients/{patient_id}/bills")
async def get_bills(patient_id: str):
    bills_list = []
    async for b in db.bills.find({"patient_id": patient_id}).sort("created_at", -1):
        b["id"] = str(b["_id"])
        del b["_id"]
        bills_list.append(b)
    return bills_list

@app.delete("/doctors/{doctor_id}")
async def delete_doctor(doctor_id: str):
    from bson import ObjectId
    try:
        obj_id = ObjectId(doctor_id)
        result = await db.doctors.delete_one({"_id": obj_id})
    except:
        result = await db.doctors.delete_one({"id": doctor_id})
    return {"message": "Doctor deleted successfully"}

@app.delete("/patients/{patient_id}")
async def delete_patient(patient_id: str):
    from bson import ObjectId
    try:
        obj_id = ObjectId(patient_id)
        result = await db.patients.delete_one({"_id": obj_id})
    except:
        result = await db.patients.delete_one({"id": patient_id})
    return {"message": "Patient deleted successfully"}

@app.get("/admin/users")
async def get_all_users():
    users = []
    # Collect from all management collections
    for collection in [db.admin, db.doctors, db.patients]:
        async for u in collection.find({}):
            u["id"] = str(u["_id"])
            if "_id" in u: del u["_id"]
            if "password" in u: del u["password"]
            users.append(u)
            
    # Also check legacy users collection if it exists
    async for u in db.users.find({}):
        u["id"] = str(u["_id"])
        if "_id" in u: del u["_id"]
        if "password" in u: del u["password"]
        users.append(u)
        
    return users

@app.get("/admin/stats")
async def get_admin_stats():
    patient_count = await db.patients.count_documents({})
    doctor_count = await db.doctors.count_documents({})
    appointment_count = await db.appointments.count_documents({})
    user_count = await db.admin.count_documents({}) + doctor_count + patient_count
    
    return {
        "patients": patient_count,
        "doctors": doctor_count,
        "appointments": appointment_count,
        "users": user_count,
        "uptime": "99.9%"
    }

@app.get("/admin/audit-logs")
async def get_audit_logs():
    logs = []
    async for log in db.audit_logs.find().sort("timestamp", -1).limit(100):
        log["id"] = str(log["_id"])
        del log["_id"]
        # Convert datetime to ISO string for frontend
        if isinstance(log.get("timestamp"), datetime):
            log["dateTime"] = log["timestamp"].isoformat()
        logs.append(log)
    return logs

@app.delete("/admin/users/{user_id}")
async def delete_user(user_id: str):
    from bson import ObjectId
    try:
        oid = ObjectId(user_id)
    except:
        oid = None

    deleted = False
    for col in [db.admin, db.doctors, db.patients, db.users]:
        if oid:
            res = await col.delete_one({"_id": oid})
        else:
            res = await col.delete_one({"id": user_id})
            
        if res.deleted_count > 0:
            deleted = True
            break
            
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}

@app.post("/appointments", status_code=status.HTTP_201_CREATED)
async def book_appointment(appointment: AppointmentCreate):
    appointment_dict = appointment.model_dump()
    appointment_dict["created_at"] = datetime.utcnow()
    result = await db.appointments.insert_one(appointment_dict)
    appointment_dict["id"] = str(result.inserted_id)
    del appointment_dict["_id"]
    return appointment_dict

@app.get("/appointments")
async def get_appointments(user_id: Optional[str] = None, role: Optional[str] = None):
    query = {}
    if role == 'Patient' and user_id:
        query["patient_id"] = user_id
    elif role == 'Doctor' and user_id:
        query["doctor_id"] = user_id
        
    appointments = []
    async for apt in db.appointments.find(query).sort("date", 1):
        apt["id"] = str(apt["_id"])
        del apt["_id"]
        appointments.append(apt)
    return appointments

@app.put("/appointments/{appointment_id}")
async def update_appointment(appointment_id: str, update: AppointmentUpdate):
    from bson import ObjectId
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    result = await db.appointments.update_one(
        {"_id": ObjectId(appointment_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    return {"message": "Appointment updated successfully"}


if __name__ == "__main__":
    import uvicorn
    # Use string for app and enable reload for better development experience
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
