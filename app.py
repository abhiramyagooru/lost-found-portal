from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
import sqlite3, os, re
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = 'supersecretkey'
UPLOAD_FOLDER = 'static/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure upload dir exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# ---------- Initialize Database ----------
def init_db():
    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        place TEXT NOT NULL,
        contact TEXT NOT NULL,
        collect_place TEXT,
        image TEXT
    )''')
    conn.commit()
    conn.close()

init_db()

# ---------- Home Page ----------
@app.route('/')
def index():
    return render_template('index.html')

# ---------- Add (Register) Lost/Found Item ----------
@app.route('/add_item', methods=['GET', 'POST'])
def add_item():
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        place = request.form.get('place', '').strip()
        contact = request.form.get('contact', '').strip()
        collect_place = request.form.get('collect_place', '').strip()
        image = request.files.get('image')

        # Validate item name (letters + spaces only)
        if not re.match(r"^[A-Za-z ]+$", name):
            flash('Item name should contain only letters and spaces.', 'error')
            return redirect(url_for('add_item'))

        # Validate 10-digit contact number
        if not contact.isdigit() or len(contact) != 10:
            flash('Invalid contact number! Must be exactly 10 digits.', 'error')
            return redirect(url_for('add_item'))

        # Save image (avoid overwrite)
        filename = None
        if image and image.filename != '':
            filename = secure_filename(image.filename)
            save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            if os.path.exists(save_path):
                base, ext = os.path.splitext(filename)
                filename = f"{base}_{int(__import__('time').time())}{ext}"
                save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            image.save(save_path)

        # Insert into database
        conn = sqlite3.connect('database.db')
        c = conn.cursor()
        c.execute('INSERT INTO items (name, place, contact, collect_place, image) VALUES (?, ?, ?, ?, ?)',
                  (name, place, contact, collect_place, filename))
        conn.commit()
        conn.close()

        flash('Item added successfully!', 'success')
        return redirect(url_for('index'))

    return render_template('add_item.html')


# ---------- View All Items ----------
@app.route('/view_items')
def view_items():
    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    c.execute('SELECT id, name, place, contact, collect_place, image FROM items ORDER BY id DESC')
    items = c.fetchall()
    conn.close()
    return render_template('view_items.html', items=items)


# ---------- Search Page ----------
@app.route('/search', methods=['GET', 'POST'])
def search():
    items = []
    if request.method == 'POST':
        keyword = request.form.get('keyword', '').strip().lower()
        conn = sqlite3.connect('database.db')
        c = conn.cursor()
        c.execute("""
            SELECT id, name, place, contact, collect_place, image
            FROM items
            WHERE LOWER(name) LIKE ? OR LOWER(place) LIKE ?
        """, (f"%{keyword}%", f"%{keyword}%"))
        items = c.fetchall()
        conn.close()
    return render_template('search.html', items=items)


# ---------- Autocomplete (AJAX) ----------
@app.route('/autocomplete', methods=['POST'])
def autocomplete():
    keyword = request.form.get('keyword', '').strip().lower()
    suggestions = []
    if keyword:
        conn = sqlite3.connect('database.db')
        c = conn.cursor()
        c.execute("SELECT DISTINCT name FROM items WHERE LOWER(name) LIKE ? LIMIT 8", (f"%{keyword}%",))
        suggestions += [row[0] for row in c.fetchall()]
        c.execute("SELECT DISTINCT place FROM items WHERE LOWER(place) LIKE ? LIMIT 8", (f"%{keyword}%",))
        suggestions += [row[0] for row in c.fetchall()]
        conn.close()
        # keep unique preserving order
        seen = set()
        suggestions = [x for x in suggestions if not (x in seen or seen.add(x))]
    return jsonify(suggestions)


# ---------- View Item Details ----------
@app.route('/item/<int:item_id>')
def item_details(item_id):
    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    c.execute('SELECT id, name, place, contact, collect_place, image FROM items WHERE id = ?', (item_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        flash('Item not found or already collected.', 'error')
        return redirect(url_for('search'))
    item = {
        'id': row[0],
        'name': row[1],
        'place': row[2],
        'contact': row[3],
        'collect_place': row[4],
        'image': row[5]
    }
    return render_template('item_details.html', item=item)


# ---------- Mark Item as Collected ----------
@app.route('/collected/<int:item_id>', methods=['POST'])
def collected(item_id):
    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    c.execute('SELECT image FROM items WHERE id = ?', (item_id,))
    row = c.fetchone()
    if row and row[0]:
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], row[0])
        if os.path.exists(image_path):
            try:
                os.remove(image_path)
            except Exception:
                pass
    c.execute('DELETE FROM items WHERE id = ?', (item_id,))
    conn.commit()
    conn.close()
    flash('Item marked as collected and removed from the database.', 'success')
    return redirect(url_for('search'))


# ---------- Run App ----------
if __name__ == '__main__':
    app.run(debug=True)
