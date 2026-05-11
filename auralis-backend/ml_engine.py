import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import joblib
import os
from typing import List, Dict, Any

MODEL_PATH = "risk_model.joblib"

class MLEngine:
    def __init__(self):
        self.model = None
        self.load_model()

    def load_model(self):
        if os.path.exists(MODEL_PATH):
            try:
                import joblib
                self.model = joblib.load(MODEL_PATH)
            except Exception as e:
                print(f"Error loading model: {e}")

    def preprocess_longitudinal(self, vitals_history: List[Dict[str, Any]]) -> np.ndarray:
        """
        Aggregates longitudinal vitals into static features: Mean, Max, Min, Std.
        Expects a list of dicts with keys: hr, sbp, temp, spo2.
        """
        if not vitals_history:
            return np.zeros((1, 16)) # 4 metrics * 4 stats

        df = pd.DataFrame(vitals_history)
        metrics = ['hr', 'sbp', 'temp', 'spo2']
        features = []

        for m in metrics:
            if m in df.columns:
                # Long-term Baseline
                mean_val = df[m].mean()
                
                # Short-term Volatility (last 3 readings)
                recent_avg = df[m].tail(3).mean()
                trend_val = recent_avg - mean_val
                
                features.extend([
                    mean_val,
                    df[m].max(),
                    df[m].std() if len(df) > 1 else 0.0,
                    trend_val # Trend feature: capture sudden spikes/drops
                ])
            else:
                features.extend([0.0, 0.0, 0.0, 0.0])

        return np.array(features).reshape(1, -1)

    def calculate_news2_score(self, latest: Dict[str, Any]) -> int:
        """
        Calculates a simplified NEWS2 (National Early Warning Score) component.
        """
        score = 0
        hr = latest.get('hr', 75)
        sbp = latest.get('sbp', 120)
        spo2 = latest.get('spo2', 98)
        
        # Respiration & Temp omitted for simplicity in this version
        if hr > 130 or hr < 40: score += 3
        elif hr > 110 or hr < 50: score += 2
        
        if sbp <= 90 or sbp >= 220: score += 3
        elif sbp <= 100 or sbp >= 160: score += 2
        
        if spo2 < 92: score += 3
        elif spo2 < 94: score += 2
        
        return score

    def predict_readmission(self, vitals_history: List[Dict[str, Any]], static_features: Dict[str, Any] = None) -> float:
        """
        Predicts 30-day readmission risk using a hybrid ML + Clinical heuristic approach.
        """
        if not vitals_history:
            return 0.15

        latest = vitals_history[-1]
        X = self.preprocess_longitudinal(vitals_history)
        
        # 1. Base ML Prediction
        try:
            if self.model:
                ml_prob = float(self.model.predict_proba(X)[0][1])
            else:
                # Sophisticated Fallback Heuristic
                ml_prob = 0.15
                if latest.get('hr', 75) > 105: ml_prob += 0.3
                if latest.get('sbp', 120) > 155: ml_prob += 0.2
        except Exception:
            ml_prob = 0.15

        # 2. Clinical Threshold (NEWS-2) Calibration
        news2 = self.calculate_news2_score(latest)
        clinical_skew = (news2 / 9.0) # Max news2 here is ~9
        
        # Hybrid Score: 60% ML, 40% Clinical Safety
        final_risk = (ml_prob * 0.6) + (clinical_skew * 0.4)
        
        # 3. High-Urgency Overrides (Safety Net)
        if latest.get('spo2', 98) < 88 or latest.get('sbp', 120) >= 180 or latest.get('hr', 75) >= 140:
            final_risk = max(final_risk, 0.95)
        elif latest.get('sbp', 120) >= 160 or latest.get('hr', 75) >= 120:
            final_risk = max(final_risk, 0.75)
            
        return min(final_risk, 0.98)

# Global instance
ml_predictor = MLEngine()
