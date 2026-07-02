import os
import time
from google import genai
from google.genai import errors
from dotenv import load_dotenv

load_dotenv()

def get_ai_response(message):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set")

    client = genai.Client(api_key=api_key)

    max_retries = 4
    delay = 1.0
    
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=message
            )
            return response.text
        except (errors.ServerError, errors.APIError) as e:
            if attempt == max_retries - 1:
                print(f"ERROR: API call failed after {max_retries} attempts: {repr(e)}")
                raise e
            
            print(f"WARNING: Gemini API transient error (attempt {attempt + 1}/{max_retries}): {repr(e)}. Retrying in {delay}s...")
            time.sleep(delay)
            delay *= 2.0
        except Exception as e:
            print("ERROR:", repr(e))
            raise e
