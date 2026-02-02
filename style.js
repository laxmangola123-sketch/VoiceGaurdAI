class VoiceFraudDetector {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        
        this.initElements();
        this.bindEvents();
    }
    
    initElements() {
        this.fileInput = document.getElementById('audioFile');
        this.recordBtn = document.getElementById('recordBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.audioPlayer = document.getElementById('audioPlayer');
        this.player = document.getElementById('player');
        this.loading = document.getElementById('loading');
        this.results = document.getElementById('results');
        this.resultCard = document.getElementById('resultCard');
        this.confidenceFill = document.getElementById('confidenceFill');
    }
    
    bindEvents() {
        this.fileInput.addEventListener('change', (e) => this.handleFile(e));
        this.recordBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
    }
    
    async handleFile(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        this.player.src = URL.createObjectURL(file);
        this.audioPlayer.classList.remove('hidden');
        await this.analyzeAudio(file);
    }
    
    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            
            this.mediaRecorder.ondataavailable = (e) => {
                this.audioChunks.push(e.data);
            };
            
            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                const file = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
                
                this.player.src = URL.createObjectURL(file);
                this.audioPlayer.classList.remove('hidden');
                this.analyzeAudio(file);
                
                this.audioChunks = [];
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            
            this.recordBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.recordBtn.textContent = '🎤 Recording...';
            this.recordBtn.style.background = '#ff9800';
            
        } catch (err) {
            alert('Error accessing microphone: ' + err.message);
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            
            this.isRecording = false;
            this.recordBtn.disabled = false;
            this.stopBtn.disabled = true;
            this.recordBtn.textContent = '🎤 Record Voice';
            this.recordBtn.style.background = '#ff4444';
        }
    }
    
    async analyzeAudio(audioFile) {
        this.showLoading();
        this.hideResults();
        
        const formData = new FormData();
        formData.append('audio', audioFile);
        
        try {
            const response = await fetch('http://localhost:5000/api/analyze', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            this.displayResults(result);
            
        } catch (error) {
            console.error('Analysis error:', error);
            this.displayError('Analysis failed. Please try again.');
        }
    }
    
    displayResults(result) {
        this.hideLoading();
        this.showResults();
        
        const resultCard = this.resultCard;
        const isFraud = result.is_fraud;
        
        resultCard.className = `result-card ${isFraud ? 'result-fraud' : 'result-safe'}`;
        
        const title = isFraud ? '🚨 FRAUD DETECTED' : '✅ Voice Verified';
        const confidence = (result.confidence * 100).toFixed(1);
        
        resultCard.innerHTML = `
            <div class="result-title">${title}</div>
            <div class="result-details">
                <p><strong>Confidence:</strong> ${confidence}%</p>
                <p><strong>Language:</strong> ${result.language.toUpperCase()}</p>
                <p><strong>Robotic Score:</strong> ${(result.robotic_score * 100).toFixed(0)}%</p>
                <p><strong>Reason:</strong> ${result.reason}</p>
            </div>
        `;
        
        this.confidenceFill.style.width = `${confidence}%`;
    }
    
    displayError(message) {
        this.hideLoading();
        this.resultCard.innerHTML = `
            <div class="result-title" style="color: #f44336;">❌ Error</div>
            <div class="result-details">${message}</div>
        `;
        this.showResults();
    }
    
    showLoading() {
        this.loading.classList.remove('hidden');
    }
    
    hideLoading() {
        this.loading.classList.add('hidden');
    }
    
    showResults() {
        this.results.classList.remove('hidden');
    }
    
    hideResults() {
        this.results.classList.add('hidden');
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    new VoiceFraudDetector();
});
