from flask import Flask, request, jsonify
from chromadb import PersistentClient
import requests
import cohere
from unstructured.partition.html import partition_html
from unstructured.cleaners.core import clean
from unstructured.chunking.title import chunk_by_title

co = cohere.Client('mHyuSAE5ZntV9iuvGtOb7nW99q9sEvfIwnuzMS2Y')
loaded = False;
app = Flask(__name__)
client = PersistentClient()
collection = client.get_or_create_collection("embeddings")

def embed(docs):
    return co.embed(
      texts=docs,
      model='embed-english-v3.0',
      input_type='classification'
    ).embeddings

@app.route('/embeddings/ping', methods=['GET'])
def ping():
    return jsonify({"status": "success", "message": "pong"}), 200

@app.route('/embeddings/insert', methods=['POST'])
def insert_vector():
    global loaded
    if loaded == True:
        return jsonify({"status": "error", "message": "Already loaded"}), 400
    
    loaded = True
    content = request.json
    id = content['id']

    response = requests.get("https://ar5iv.org/" + id)
    file = open("paper.html", "wb")
    file.write(response.content)
    file.close()

    elements = partition_html(filename="paper.html")
    chunks = chunk_by_title(elements, max_characters=500)

    docs = [chunk.text for chunk in chunks]

    embeddings = embed(docs)

    collection.add(embeddings=embeddings, documents=docs, ids=[str(x) for x in list(range(collection.count() + 1, collection.count() + len(embeddings) + 1))])
    print(collection.count())
    return jsonify({"status": "success"}), 200

@app.route('/embeddings/query', methods=['POST'])
def retrieve_vector():
    content = request.json
    print(content)
    query = content['query']
    query_vector = embed([query])[0]

    retrieve_vector = collection.query(
      query_embeddings=[query_vector],
      n_results=5,
    )
    
    print(retrieve_vector)
    if retrieve_vector:
        return jsonify({"status": "success", "data": retrieve_vector["documents"]}), 200
    else:
        return jsonify({"status": "error", "message": "Vector not found"}), 404

if __name__ == '__main__':
    app.run(port=5328)