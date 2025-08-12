from flask import Flask, request, jsonify, send_file
from recommend import recommend_products
from chatbot import chatbot_reply
from flask_cors import CORS
from gtts import gTTS
from io import BytesIO

app = Flask(__name__)
CORS(app)  # Cho phép frontend truy cập API

@app.route("/api/recommend", methods=["POST"])
def recommend():
    data = request.json
    product = data.get("product", "")
    suggestions = recommend_products(product)
    return jsonify(suggestions)

@app.route("/api/chatbot", methods=["POST"])
def chatbot_api():
    data = request.get_json()
    message = data.get("message", "")
    result = chatbot_reply(message)
    print("User hỏi:", message)
    print("Bot trả lời:", result)
    return jsonify(result)




if __name__ == "__main__":
    app.run(debug=True, port=3001)
