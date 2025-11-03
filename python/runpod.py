from openai import OpenAI

MODEL_NAME = "openai/gpt-oss-20b"

client = OpenAI(base_url=RUNPOD_BASE_URL, api_key=RUNPOD_API_KEY)

# Create a streaming chat completion request
stream = client.chat.completions.create(
    model=MODEL_NAME,
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Write a short poem about stars."},
    ],
    temperature=0.7,
    max_tokens=200,
    stream=True,  # Enable streaming
)

# Print the streaming response
print("Response: ", end="", flush=True)
for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
print()
