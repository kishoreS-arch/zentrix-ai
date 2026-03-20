import urllib.request
try:
    with urllib.request.urlopen("https://generativelanguage.googleapis.com/") as response:
        print(f"Status: {response.status}")
except Exception as e:
    print(f"Error: {e}")
