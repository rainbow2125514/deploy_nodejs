from db import products_collection
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def recommend_products(product_name: str):
    # Lấy danh sách tên sản phẩm từ MongoDB
    product_docs = list(products_collection.find({}, {"name": 1}))
    product_names = [doc["name"] for doc in product_docs]

    if not product_names:
        return []

    # Tính vector TF-IDF và độ tương đồng cosine
    tfidf = TfidfVectorizer()
    tfidf_matrix = tfidf.fit_transform(product_names)
    query_vector = tfidf.transform([product_name])

    cosine_sim = cosine_similarity(query_vector, tfidf_matrix).flatten()
    sorted_indices = cosine_sim.argsort()[::-1]

    recommendations = [
        product_names[i] for i in sorted_indices
        if product_names[i].lower() != product_name.lower()
    ]

    return recommendations[:3]
