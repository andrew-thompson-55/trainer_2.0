import requests

api_key = "AIzaSyBJ9HKfrmqoW7dog1VoFeFVbR8N0mdGpXs"
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"

response = requests.get(url)
print(response.status_code)
print(response.json())
