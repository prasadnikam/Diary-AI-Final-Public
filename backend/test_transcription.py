import requests
import os
import base64

# Configuration
API_URL = "http://localhost:8000/api/transcribe/"
API_KEY = os.environ.get("GEMINI_API_KEY")

if not API_KEY:
    print("⚠️  GEMINI_API_KEY environment variable not set. Using dummy key for testing.")
    API_KEY = "dummy_key"

def test_transcription_file():
    print("\n--- Testing File Upload ---")
    
    # Create a dummy file (this won't be valid audio, so Gemini might reject it, 
    # but we want to test the endpoint connectivity and file handling first)
    with open("test_audio.webm", "wb") as f:
        f.write(b"dummy audio content")

    try:
        with open("test_audio.webm", "rb") as f:
            files = {'audio': ('test_audio.webm', f, 'audio/webm')}
            headers = {'X-Gemini-API-Key': API_KEY} if API_KEY else {}
            
            response = requests.post(API_URL, files=files, headers=headers)
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
    finally:
        if os.path.exists("test_audio.webm"):
            os.remove("test_audio.webm")

def test_transcription_base64():
    print("\n--- Testing Base64 Data ---")
    
    # Dummy base64 audio
    dummy_audio = base64.b64encode(b"dummy audio content").decode('utf-8')
    data_url = f"data:audio/webm;base64,{dummy_audio}"
    
    payload = {'audio_data': data_url}
    headers = {'X-Gemini-API-Key': API_KEY} if API_KEY else {}
    
    response = requests.post(API_URL, json=payload, headers=headers)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")

if __name__ == "__main__":
    test_transcription_file()
    test_transcription_base64()
