from flask import Flask, request, jsonify
from flask_cors import CORS
import librosa
import numpy as np
import soundfile as sf
from sklearn.ensemble import RandomForestClassifier
import pickle
import os
from langdetect import detect
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)

class VoiceFraudDetector:
    def __init__(self):
        self.model = self.load_model()
    
    def load_model(self):
        """Load pre-trained fraud detection model"""
        try:
            # Placeholder for actual model - in production, train with real data
            return RandomForestClassifier(n_estimators=100)
        except:
            return None
    
    def extract_features(self, audio_path):
        """Extract audio features for fraud detection"""
        try:
            # Load audio
            y, sr = librosa.load(audio_path, sr=22050)
            
            # Extract features
            features = {}
            
            # MFCC features
            mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
            features['mfcc_mean'] = np.mean(mfccs, axis=1)
            features['mfcc_std'] = np.std(mfccs, axis=1)
            
            # Spectral features
            features['spectral_centroid'] = np.mean(librosa.feature.spectral_centroid(y=y, sr=sr))
            features['spectral_rolloff'] = np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr))
            features['zero_crossing_rate'] = np.mean(librosa.feature.zero_crossing_rate(y))
            
            # Chroma features
            chroma = librosa.feature.chroma_stft(y=y, sr=sr)
            features['chroma_mean'] = np.mean(chroma, axis=1)
            features['chroma_std'] = np.std(chroma, axis=1)
            
            # Tempo
            tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
            features['tempo'] = tempo
            
            # RMS energy
            rms = librosa.feature.rms(y=y)
            features['rms_mean'] = np.mean(rms)
            
            return np.hstack([
                features['mfcc_mean'], features['mfcc_std'],
                features['chroma_mean'], features['chroma_std'],
                [features['spectral_centroid'], features['spectral_rolloff'], 
                 features['zero_crossing_rate'], features['tempo'], features['rms_mean']]
            ])
        except Exception as e:
            print(f"Feature extraction error: {e}")
            return None
    
    def detect_language(self, audio_path):
        """Detect spoken language"""
        try:
            y, sr = librosa.load(audio_path, sr=22050)
            # Simple language detection based on spectral characteristics
            # In production, use proper speech-to-text + language detection
            spectral_centroid = np.mean(librosa.feature.spectral_centroid(y=y, sr=sr))
            
            if spectral_centroid > 2000:
                return "telugu"
            elif spectral_centroid > 1800:
                return "malayalam"
            elif spectral_centroid > 1600:
                return "hindi"
            else:
                return "english"
        except:
            return "unknown"
    
    def detect_fraud(self, audio_path):
        """Main fraud detection pipeline"""
        features = self.extract_features(audio_path)
        if features is None:
            return {"is_fraud": True, "confidence": 0.9, "reason": "Audio processing failed"}
        
        language = self.detect_language(audio_path)
        
        # Mock prediction - replace with actual model.predict_proba()
        # Features analysis for fraud detection
        is_robotic = np.any(features[:13] > 15)  # High MFCC indicates robotic
        high_variance = np.std(features[13:26]) > 5  # Unnatural variance
        
        fraud_score = 0.3 * int(is_robotic) + 0.4 * int(high_variance) + 0.3 * np.random.random()
        
        return {
            "is_fraud": fraud_score > 0.6,
            "confidence": min(fraud_score, 1.0),
            "language": language,
            "robotic_score": float(is_robotic),
            "reason": "High MFCC variance detected" if is_robotic else "Unnatural speech patterns"
        }

detector = VoiceFraudDetector()
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/api/analyze', methods=['POST'])
def analyze_voice():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    file = request.files['audio']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(filepath)
    
    result = detector.detect_fraud(filepath)
    
    # Cleanup
    os.remove(filepath)
    
    return jsonify(result)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
