from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import sqlite3
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

# Initialize database
def init_db():
    with sqlite3.connect('todos.db') as conn:
        c = conn.cursor()
        c.execute('''
            CREATE TABLE IF NOT EXISTS todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT NOT NULL,
                completed BOOLEAN NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL,
                completed_at TIMESTAMP
            )
        ''')
        conn.commit()

init_db()

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

@app.route('/todos', methods=['GET'])
def get_todos():
    try:
        with sqlite3.connect('todos.db') as conn:
            conn.row_factory = dict_factory
            c = conn.cursor()
            c.execute('SELECT * FROM todos ORDER BY created_at DESC')
            todos = c.fetchall()
            return jsonify(todos)
    except sqlite3.Error as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500

@app.route('/todos', methods=['POST'])
def create_todo():
    data = request.json
    if not data or 'text' not in data:
        return jsonify({'error': 'Text is required'}), 400
    
    if len(data['text'].strip()) < 1:
        return jsonify({'error': 'Todo text cannot be empty'}), 400

    try:
        with sqlite3.connect('todos.db') as conn:
            conn.row_factory = dict_factory
            c = conn.cursor()
            now = datetime.utcnow().isoformat()
            c.execute(
                'INSERT INTO todos (text, created_at) VALUES (?, ?)',
                (data['text'], now)
            )
            conn.commit()
            
            # Get the created todo
            c.execute(
                'SELECT * FROM todos WHERE id = ?',
                (c.lastrowid,)
            )
            todo = c.fetchone()
            return jsonify(todo), 201
    except sqlite3.Error as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500

@app.route('/todos/<int:id>', methods=['PUT'])
def update_todo(id):
    data = request.json
    if not isinstance(data.get('completed'), bool):
        return jsonify({'error': 'Completed status is required'}), 400

    try:
        with sqlite3.connect('todos.db') as conn:
            conn.row_factory = dict_factory
            c = conn.cursor()
            now = datetime.utcnow().isoformat()
            
            if data['completed']:
                c.execute(
                    'UPDATE todos SET completed = ?, completed_at = ? WHERE id = ?',
                    (data['completed'], now, id)
                )
            else:
                c.execute(
                    'UPDATE todos SET completed = ?, completed_at = NULL WHERE id = ?',
                    (data['completed'], id)
                )
            conn.commit()

            c.execute('SELECT * FROM todos WHERE id = ?', (id,))
            todo = c.fetchone()
            if todo is None:
                return jsonify({'error': 'Todo not found'}), 404
            return jsonify(todo)
    except sqlite3.Error as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500

@app.route('/')
def index():
    return send_file('index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_file(path)

@app.route('/todos/<int:id>', methods=['DELETE'])
def delete_todo(id):
    try:
        with sqlite3.connect('todos.db') as conn:
            conn.row_factory = dict_factory
            c = conn.cursor()
            
            # Check if todo exists
            c.execute('SELECT * FROM todos WHERE id = ?', (id,))
            todo = c.fetchone()
            if todo is None:
                return jsonify({'error': 'Todo not found'}), 404
            
            # Delete todo
            c.execute('DELETE FROM todos WHERE id = ?', (id,))
            conn.commit()
            return jsonify({'message': 'Todo deleted successfully'})
    except sqlite3.Error as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True)
