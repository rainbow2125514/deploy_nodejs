from db import products_collection, variants_collection, categories_collection, subcategories_collection
from bson import ObjectId
from dotenv import load_dotenv
import os
import requests

load_dotenv()

def ask_ai(message: str) -> str:
    api_key = os.getenv("GOOGLE_GEMINI_API_KEY")
    url = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent"
    headers = {"Content-Type": "application/json"}
    data = {
        "contents": [
            {
                "parts": [
                    {"text": f"Bạn là trợ lý bán hàng gấu bông, trả lời thân thiện, ngắn gọn, dễ hiểu cho khách hàng.\n{message}"}
                ]
            }
        ]
    }
    response = requests.post(f"{url}?key={api_key}", headers=headers, json=data, timeout=20)
    if response.ok:
        res = response.json()
        try:
            return res["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception:
            return "Xin lỗi, mình chưa hiểu ý bạn."
    else:
        print("Gemini API error:", response.text)
        return "Xin lỗi, hệ thống AI đang bận hoặc hết lượt miễn phí."

def chatbot_reply(message: str) -> dict:
    message_lower = message.lower()
    products = list(products_collection.find())

    # Ưu tiên: Nếu câu hỏi chứa tên sản phẩm, trả về sản phẩm luôn
    matched_products = [
        p for p in products
        if p.get("name", "").lower() in message_lower or message_lower in p.get("name", "").lower()
    ]
    if matched_products:
        ai_reply = ask_ai(message)
        result = []
        for p in matched_products[:4]:
            images = p.get("images", [])
            image_url = f"http://api.mimibear.id.vn/images/{images[0]}" if images else None
            variants = list(variants_collection.find({"productId": p["_id"]}))
            sizes = []
            prices = []
            for v in variants:
                sz = v.get("size")
                pr = v.get("price")
                if sz:
                    sizes.append(sz)
                if pr is not None:
                    prices.append(pr)
            result.append({
                "_id": str(p["_id"]),
                "name": p.get("name"),
                "sizes": sizes,
                "price": prices,
                "image": image_url
            })
        return {
            "type": "products",
            "content": ai_reply,
            "products": result
        }

    # Ưu tiên: Nếu câu hỏi chứa tên danh mục hoặc subcategory, trả về danh mục luôn
    categories = list(categories_collection.find())
    subcategories = list(subcategories_collection.find())
    for cat in categories:
        if cat.get("name", "").lower() in message_lower or message_lower in cat.get("name", "").lower():
            ai_reply = ask_ai(message)
            prods = list(products_collection.find({"categoryId": cat["_id"]}).limit(4))
            if prods:
                result = []
                for p in prods:
                    images = p.get("images", [])
                    image_url = f"http://api.mimibear.id.vn/images/{images[0]}" if images else None
                    variants = list(variants_collection.find({"productId": p["_id"]}))
                    sizes = []
                    prices = []
                    for v in variants:
                        sz = v.get("size")
                        pr = v.get("price")
                        if sz:
                            sizes.append(sz)
                        if pr is not None:
                            prices.append(pr)
                    result.append({
                        "_id": str(p["_id"]),
                        "name": p.get("name"),
                        "sizes": sizes,
                        "price": prices,
                        "image": image_url
                    })
                return {
                    "type": "products",
                    "content": ai_reply,
                    "products": result
                }
            else:
                return {"type": "text", "content": f"Hiện chưa có sản phẩm nào trong danh mục {cat['name']}."}
    for subcat in subcategories:
        if subcat.get("name", "").lower() in message_lower or message_lower in subcat.get("name", "").lower():
            ai_reply = ask_ai(message)
            prods = list(products_collection.find({"subcategoryId": subcat["_id"]}).limit(4))
            if prods:
                result = []
                for p in prods:
                    images = p.get("images", [])
                    image_url = f"http://api.mimibear.id.vn/images/{images[0]}" if images else None
                    variants = list(variants_collection.find({"productId": p["_id"]}))
                    sizes = []
                    prices = []
                    for v in variants:
                        sz = v.get("size")
                        pr = v.get("price")
                        if sz:
                            sizes.append(sz)
                        if pr is not None:
                            prices.append(pr)
                    result.append({
                        "_id": str(p["_id"]),
                        "name": p.get("name"),
                        "sizes": sizes,
                        "price": prices,
                        "image": image_url
                    })
                return {
                    "type": "products",
                    "content": ai_reply,
                    "products": result
                }
            else:
                return {"type": "text", "content": f"Hiện chưa có sản phẩm nào trong danh mục {subcat['name']}."}

    # Nếu người dùng hỏi về danh mục
    if "danh mục" in message_lower:
        categories = list(categories_collection.find({"hidden": {"$ne": True}}))
        if categories:
            cats = []
            for c in categories:
                subs = [s["name"] for s in subcategories_collection.find({"categoryId": c["_id"]})]
                if subs:
                    cats.append(f'{c["name"]} ({", ".join(subs)})')
                else:
                    cats.append(c["name"])
            cats_str = "; ".join(cats)
            return {
                "type": "text",
                "content": f"Các sản phẩm hiện có: {cats_str}"
            }
        else:
            return {
                "type": "text",
                "content": "Hiện chưa có sản phẩm nào."
            }

    ai_reply = ask_ai(message)
    # Nếu AI trả về câu mặc định, chỉ trả về text, không trả về sản phẩm
    if ai_reply.strip() in [
        "Xin lỗi, mình chưa hiểu ý bạn.",
        "Xin lỗi, hệ thống AI đang bận hoặc hết lượt miễn phí.",
        "Em chưa hiểu ý Anh/Chị, vui lòng hỏi lại nhé!"
    ]:
        return {"type": "text", "content": ai_reply}

    return {"type": "text", "content": ai_reply}